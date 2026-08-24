import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GetIndicatorDetailsService } from './get-indicator-details.service';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';
import { ContractIndicatorDetailsReport } from '@shared/interfaces/contract-indicator-details.interface';

const indicatorDetailsUrl = (id: string) =>
  `${environment.mainApiUrl}agresso/contracts/reports/indicator-details?contract-id=${encodeURIComponent(id)}`;

describe('GetIndicatorDetailsService', () => {
  let service: GetIndicatorDetailsService;
  let httpMock: HttpTestingController;

  const mockReport: ContractIndicatorDetailsReport = {
    capacity_sharing: {
      meta: { total_results: 5, n: 4 },
      total_trainees: 120,
      gender_split: [
        { gender: 'female', count: 70 },
        { gender: 'male', count: 50 }
      ],
      session_lengths: [
        { id: 1, name: 'Short-term', count: 3 },
        { id: 2, name: 'Long-term', count: 1 }
      ],
      delivery_modalities: [
        { id: 1, name: 'Virtual', count: 2 },
        { id: 2, name: 'In person', count: 2 }
      ],
      session_types: [
        { id: 1, name: 'Individual', count: 1 },
        { id: 2, name: 'Group', count: 3 }
      ]
    },
    innovation_dev: {
      meta: { total_results: 3, n: 3 },
      readiness_levels: [
        { id: 1, level: 3, name: 'Proof of concept', count: 1 },
        { id: 2, level: 7, name: 'Demonstration', count: 2 }
      ],
      innovation_types: [
        { id: 1, name: 'Technological', count: 2 },
        { id: 2, name: 'Social', count: 1 }
      ],
      innovation_natures: [
        { id: 1, name: 'Capacity development', count: 3 }
      ],
      anticipated_users: [
        { id: 1, name: 'Farmers', count: 2 },
        { id: 2, name: 'Policymakers', count: 1 }
      ],
      scalability_profile: [
        { key: 'is_cheaper_than_alternatives', name: 'Cheaper than alternatives', true_count: 2, answered_count: 3 },
        { key: 'is_easier_to_use', name: 'Easier to use', true_count: 3, answered_count: 3 }
      ]
    },
    knowledge_product: {
      meta: { total_results: 8, n: 8 },
      open_access_split: [
        { name: 'Open Access', count: 6 },
        { name: 'Restricted', count: 2 }
      ],
      access_status: [
        { name: 'Published', count: 7 },
        { name: 'In Press', count: 1 }
      ],
      types: [
        { id: 1, name: 'Journal Article', count: 5 },
        { id: 2, name: 'Book Chapter', count: 3 }
      ],
      publications_by_year: [
        { year: 2024, count: 3 },
        { year: 2025, count: 5 }
      ]
    },
    policy_change: {
      meta: { total_results: 2, n: 2 },
      stage_funnel: [
        { id: 1, stage_id: 1, name: 'Stage 1: Policy Informs', stage_name: 'Policy Informs', order: 1, count: 2 },
        { id: 2, stage_id: 2, name: 'Stage 2: Policy Adopted', stage_name: 'Policy Adopted', order: 2, count: 1 }
      ],
      policy_types: [
        { id: 1, name: 'Policy or strategy', count: 2 }
      ],
      implicated_institutions_count: 4
    },
    oicr: {
      meta: { total_results: 2, n: 2 },
      maturity_levels: [
        { id: 1, level_name: 'Level 1', count: 1 },
        { id: 2, level_name: 'Level 2', count: 1 }
      ],
      external_use_split: [
        { name: 'External use', for_external_use: true, count: 2 }
      ]
    },
    innovation_use: {
      meta: { total_results: 4, n: 3 },
      gender_youth_reach: {
        overall: {
          women_youth: 100,
          women_not_youth: 150,
          men_youth: 80,
          men_not_youth: 120,
          total: 450
        },
        by_actor_type: [
          {
            actor_type_id: 1,
            actor_type_name: 'Smallholder farmers',
            women_youth: 60,
            women_not_youth: 90,
            men_youth: 50,
            men_not_youth: 70,
            total: 270
          }
        ]
      },
      organization_types: [
        { id: 1, name: 'NGO', count: 2 },
        { id: 2, name: 'Government', count: 1 }
      ],
      quantifications: [
        { unit: 'Hectares', total: 500, count: 2 }
      ]
    },
    reporting_velocity: [
      { month: '2025-01', count: 3 },
      { month: '2025-02', count: 5 }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, GetIndicatorDetailsService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(GetIndicatorDetailsService);
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
    expect(service.capacitySharing()).toBeNull();
    expect(service.innovationDev()).toBeNull();
    expect(service.knowledgeProduct()).toBeNull();
    expect(service.policyChange()).toBeNull();
    expect(service.oicr()).toBeNull();
    expect(service.innovationUse()).toBeNull();
    expect(service.reportingVelocity()).toBeNull();
    expect(service.sectionFailed('capacity_sharing')).toBe(false);
  });

  it('should transition loading false -> true -> false and populate all computed signals simultaneously (KZ-015)', async () => {
    expect(service.loading()).toBe(false);

    const loadPromise = service.load('A1676');
    expect(service.loading()).toBe(true);
    expect(service.loadError()).toBe(false);

    const req = httpMock.expectOne(indicatorDetailsUrl('A1676'));
    expect(req.request.method).toBe('GET');
    req.flush({ data: mockReport, successfulRequest: true });
    await loadPromise;

    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(false);
    expect(service.loadedContractId()).toBe('A1676');
    expect(service.data()).toEqual(mockReport);

    expect(service.capacitySharing()).toEqual(mockReport.capacity_sharing);
    expect(service.innovationDev()).toEqual(mockReport.innovation_dev);
    expect(service.knowledgeProduct()).toEqual(mockReport.knowledge_product);
    expect(service.policyChange()).toEqual(mockReport.policy_change);
    expect(service.oicr()).toEqual(mockReport.oicr);
    expect(service.innovationUse()).toEqual(mockReport.innovation_use);
    expect(service.reportingVelocity()).toEqual(mockReport.reporting_velocity);

    expect(service.sectionFailed('capacity_sharing')).toBe(false);
    expect(service.sectionFailed('innovation_dev')).toBe(false);
  });

  it('should deduplicate subsequent load calls for the same contractId unless force is true', async () => {
    const firstLoad = service.load('A1676');
    const req1 = httpMock.expectOne(indicatorDetailsUrl('A1676'));
    req1.flush({ data: mockReport, successfulRequest: true });
    await firstLoad;

    expect(service.loadedContractId()).toBe('A1676');

    // Subsequent load for same contractId without force does not issue another request
    await service.load('A1676');
    httpMock.expectNone(indicatorDetailsUrl('A1676'));

    // Subsequent load with force: true issues another request
    const forceLoad = service.load('A1676', { force: true });
    const req2 = httpMock.expectOne(indicatorDetailsUrl('A1676'));
    req2.flush({ data: mockReport, successfulRequest: true });
    await forceLoad;

    // Load for different contractId issues another request
    const diffLoad = service.load('B2000');
    const req3 = httpMock.expectOne(indicatorDetailsUrl('B2000'));
    req3.flush({ data: mockReport, successfulRequest: true });
    await diffLoad;

    expect(service.loadedContractId()).toBe('B2000');
  });

  it('should re-fetch with force: true when update() is called with an active loadedContractId', async () => {
    // Calling update() before any contract is loaded should do nothing
    await service.update();
    httpMock.expectNone(indicatorDetailsUrl('A1676'));

    // Initial load
    const firstLoad = service.load('A1676');
    const req1 = httpMock.expectOne(indicatorDetailsUrl('A1676'));
    req1.flush({ data: mockReport, successfulRequest: true });
    await firstLoad;

    // Call update()
    const updatePromise = service.update();
    const req2 = httpMock.expectOne(indicatorDetailsUrl('A1676'));
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

    const req = httpMock.expectOne(indicatorDetailsUrl('A1676'));
    req.error(new ProgressEvent('error'), { status: 500, statusText: 'Internal Server Error' });
    await loadPromise;

    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(true);
    expect(service.data()).toBeNull();
    expect(service.capacitySharing()).toBeNull();
    expect(service.innovationDev()).toBeNull();
    expect(service.knowledgeProduct()).toBeNull();
    expect(service.policyChange()).toBeNull();
    expect(service.oicr()).toBeNull();
    expect(service.innovationUse()).toBeNull();
    expect(service.reportingVelocity()).toBeNull();
  });

  it('should handle thrown exceptions in catch block when apiService rejects', async () => {
    const apiService = TestBed.inject(ApiService);
    jest.spyOn(apiService, 'GET_IndicatorDetails').mockRejectedValueOnce(new Error('Network failure'));

    await service.load('A1676');

    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(true);
    expect(service.data()).toBeNull();
  });

  it('should set loadError: true when apiService returns successfulRequest: false', async () => {
    const apiService = TestBed.inject(ApiService);
    jest.spyOn(apiService, 'GET_IndicatorDetails').mockResolvedValueOnce({
      data: null as any,
      successfulRequest: false,
      description: 'Internal server error',
      status: 500
    });

    await service.load('A1676');

    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(true);
    expect(service.data()).toBeNull();
  });

  it('should retry after error and successfully recover state', async () => {
    const loadPromise1 = service.load('A1676');
    const req1 = httpMock.expectOne(indicatorDetailsUrl('A1676'));
    req1.error(new ProgressEvent('error'), { status: 500, statusText: 'Internal Server Error' });
    await loadPromise1;
    expect(service.loadError()).toBe(true);

    const loadPromise2 = service.load('A1676');
    const req2 = httpMock.expectOne(indicatorDetailsUrl('A1676'));
    req2.flush({ data: mockReport, successfulRequest: true });
    await loadPromise2;

    expect(service.loadError()).toBe(false);
    expect(service.data()).toEqual(mockReport);
  });

  it('should handle partial section failures and distinguish null (failed) vs omitted (zero results)', async () => {
    const partialReport: ContractIndicatorDetailsReport = {
      capacity_sharing: null, // failed -> sectionFailed === true
      innovation_dev: mockReport.innovation_dev, // populated -> sectionFailed === false
      knowledge_product: null, // failed -> sectionFailed === true
      // policy_change, oicr, innovation_use are omitted (undefined) -> sectionFailed === false
      reporting_velocity: mockReport.reporting_velocity
    };

    const loadPromise = service.load('A1676');
    const req = httpMock.expectOne(indicatorDetailsUrl('A1676'));
    req.flush({ data: partialReport, successfulRequest: true });
    await loadPromise;

    expect(service.data()).toEqual(partialReport);
    expect(service.capacitySharing()).toBeNull();
    expect(service.innovationDev()).toEqual(mockReport.innovation_dev);
    expect(service.policyChange()).toBeNull();

    expect(service.sectionFailed('capacity_sharing')).toBe(true);
    expect(service.sectionFailed('knowledge_product')).toBe(true);
    expect(service.sectionFailed('innovation_dev')).toBe(false);
    expect(service.sectionFailed('policy_change')).toBe(false);
    expect(service.sectionFailed('oicr')).toBe(false);
    expect(service.sectionFailed('innovation_use')).toBe(false);
  });

  it('should handle empty response envelope safely setting data to null', async () => {
    const loadPromise = service.load('A1676');
    const req = httpMock.expectOne(indicatorDetailsUrl('A1676'));
    req.flush({});
    await loadPromise;

    expect(service.data()).toBeNull();
    expect(service.loading()).toBe(false);
    expect(service.loadError()).toBe(false);
    expect(service.capacitySharing()).toBeNull();
  });
});
