import { Component, Input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ApiService } from '@shared/services/api.service';
import { GetProjectDetailService } from '@shared/services/get-project-detail.service';
import { GetContractResultsSummaryService } from '@shared/services/get-contract-results-summary.service';
import { ProjectUtilsService } from '@shared/services/project-utils.service';
import { ResultsCenterService } from '../../../results-center/results-center.service';
import { GetGeoScopeService } from '@shared/services/get-geo-scope.service';
import { GetTopContributorsContractsService } from '@services/get-top-contributors-contracts.service';
import { GetTopMainContactPersonsService } from '@services/get-top-main-contact-persons.service';
import { GetTopPartnersService } from '@services/get-top-partners.service';
import { GetTopPrimaryLeversService } from '@services/get-top-primary-levers.service';
import { FileManagerService } from '@shared/services/file-manager.service';
import { DocumentOverviewService } from '@shared/services/document-overview.service';
import { RolesService } from '@shared/services/cache/roles.service';
import { ActionsService } from '@shared/services/actions.service';
import { ProjectDashboardComponent } from './project-dashboard.component';
import { GeoScopeCardComponent } from '../geo-scope-card/geo-scope-card.component';
import { ProjectDashboardCardComponent } from '../project-dashboard-card/project-dashboard-card.component';
import { ResultsCenterTableComponent } from '../../../results-center/components/results-center-table/results-center-table.component';
import { ResultsTrendCardComponent } from '../results-trend-card/results-trend-card.component';
import { SpAlignmentGraphComponent } from '../sp-alignment-graph/sp-alignment-graph.component';
import { GetContractSpAlignmentService } from '@services/get-contract-sp-alignment.service';
import { GetProjectDetail } from '@shared/interfaces/get-project-detail.interface';
import { ContractResultsSummary, ContractResultsSummaryYearBucket } from '@interfaces/contract-results-summary.interface';
import { ContractSpAlignmentReport } from '@shared/interfaces/contract-sp-alignment.interface';

@Component({
  selector: 'app-sp-alignment-graph',
  standalone: true,
  template: ''
})
class SpAlignmentGraphStubComponent {
  @Input() report: ContractSpAlignmentReport | null = null;
  @Input() loading = false;
  @Input() error = false;
}

@Component({
  selector: 'app-results-trend-card',
  standalone: true,
  template: ''
})
class ResultsTrendCardStubComponent {
  @Input() buckets: ContractResultsSummaryYearBucket[] = [];
  @Input() loading = false;
  @Input() error = false;
}

@Component({
  selector: 'app-project-dashboard-card',
  standalone: true,
  template: ''
})
class ProjectDashboardCardStubComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() compact = false;
  @Input() loading = false;
  @Input() error = false;
  @Input() empty = false;
  @Input() emptyMessage = '';
  @Input() items: unknown[] = [];
  @Input() layout = '';
  @Input() itemHeightPx: number | null = null;
  @Input() iconClass = '';
}

@Component({
  selector: 'app-geo-scope-card',
  standalone: true,
  template: ''
})
class GeoScopeCardStubComponent {}

@Component({
  selector: 'app-results-center-table',
  standalone: true,
  template: ''
})
class ResultsCenterTableStubComponent {
  @Input() hideFiltersToolbar = false;
  @Input() roundedBottom = false;
  @Input() excludedColumnFields: readonly string[] = [];
  @Input() emptyMessage = '';
}

describe('ProjectDashboardComponent', () => {
  let fixture: ComponentFixture<ProjectDashboardComponent>;
  let component: ProjectDashboardComponent;
  let apiMock: { GET_ResultsCount: jest.Mock; GET_Results: jest.Mock; GET_ContractResultsSummary: jest.Mock };
  let getProjectDetailServiceMock: { project: ReturnType<typeof signal<GetProjectDetail | null>>; loading: ReturnType<typeof signal<boolean>>; loadError: ReturnType<typeof signal<boolean>>; load: jest.Mock; invalidate: jest.Mock };
  let contractResultsSummaryMock: {
    list: ReturnType<typeof signal<ContractResultsSummary | null>>;
    loading: ReturnType<typeof signal<boolean>>;
    loadError: ReturnType<typeof signal<boolean>>;
    main: jest.Mock;
    update: jest.Mock;
  };
  let topContributorsMock: ReturnType<typeof createRankedServiceMock>;
  let topMainContactsMock: ReturnType<typeof createRankedServiceMock>;
  let topPartnersMock: ReturnType<typeof createRankedServiceMock>;
  let topLeversMock: ReturnType<typeof createRankedServiceMock>;
  let geoScopeMock: { main: jest.Mock };
  let resultsCenterServiceMock: { initializeProjectDashboardResultsTable: jest.Mock };
  let fileManagerServiceMock: { uploadFile: jest.Mock };
  let documentOverviewServiceMock: {
    fetchDocumentOverviewSummary: jest.Mock;
    generateDocumentOverview: jest.Mock;
    deleteDocumentOverviewFiles: jest.Mock;
  };
  let rolesServiceMock: { isAdmin: jest.Mock };
  let actionsServiceMock: { showToast: jest.Mock };

  function createFile(name: string, size = 1024, type = 'application/pdf'): File {
    return new File([new ArrayBuffer(size)], name, { type });
  }

  function createFileInput(files: File[]): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: files });
    return input;
  }

  function createRankedServiceMock() {
    return {
      list: signal<any[]>([]),
      loading: signal(false),
      loadError: signal(false),
      main: jest.fn(),
      update: jest.fn()
    };
  }

  async function setup(
    contractId: string | null = 'C-1',
    options?: {
      isAdmin?: boolean;
      emptyOverview?: boolean;
      rejectOverviewFetch?: boolean;
      projectData?: GetProjectDetail | null;
      summary?: ContractResultsSummary | null;
      summaryLoading?: boolean;
      summaryError?: boolean;
    }
  ) {
    topContributorsMock = createRankedServiceMock();
    topMainContactsMock = createRankedServiceMock();
    topPartnersMock = createRankedServiceMock();
    topLeversMock = createRankedServiceMock();
    geoScopeMock = { main: jest.fn() };
    resultsCenterServiceMock = { initializeProjectDashboardResultsTable: jest.fn() };
    fileManagerServiceMock = {
      uploadFile: jest.fn().mockResolvedValue({ data: { filename: 'stored-file.pdf' } })
    };
    documentOverviewServiceMock = {
      fetchDocumentOverviewSummary: options?.rejectOverviewFetch
        ? jest.fn().mockRejectedValue(new Error('fetch failed'))
        : jest.fn().mockResolvedValue(
            options?.emptyOverview
              ? { overview: { project_summary: '' } }
              : {
                  overview: {
                    project_summary: 'Stored overview paragraph.\n\nSecond stored paragraph.'
                  },
                  generated_at: '2026-07-09T20:10:56.921192+00:00',
                  available_files: [
                    {
                      file_name: 'stored-file.pdf',
                      file_key: 'star/ai-insights/test/project-overview/projects/C-1/stored-file.pdf'
                    }
                  ],
                  documents_processed: [
                    {
                      file_name: 'stored-file.pdf',
                      file_key: 'star/ai-insights/test/project-overview/projects/C-1/stored-file.pdf'
                    }
                  ]
                }
          ),
      generateDocumentOverview: jest.fn().mockResolvedValue({
        overview: {
          project_summary: 'First overview paragraph.\n\nSecond overview paragraph.'
        },
        generated_at: '2026-07-10T14:05:25.094Z',
        available_files: [
          {
            file_name: 'contract.pdf',
            file_key: 'star/ai-insights/test/project-overview/projects/C-1/stored-file.pdf'
          }
        ],
        documents_processed: [
          {
            file_name: 'contract.pdf',
            file_key: 'star/ai-insights/test/project-overview/projects/C-1/stored-file.pdf'
          }
        ]
      }),
      deleteDocumentOverviewFiles: jest.fn().mockResolvedValue(undefined)
    };
    actionsServiceMock = { showToast: jest.fn(), showGlobalAlert: jest.fn() };
    rolesServiceMock = { isAdmin: jest.fn().mockReturnValue(options?.isAdmin ?? true) };

    const defaultProjectData: GetProjectDetail = {
      grant_amount: 1234,
      divisionId: 'D1',
      division: 'Division',
      unitId: 'U1',
      unit: 'Unit',
      indicators: [
        { indicator: { indicator_id: 1, name: 'Output' }, count_results: 2 } as any,
        { indicator_id: 99, full_name: 'Fallback indicator', count_results: 4 } as any,
        { indicator_id: null, count_results: undefined } as any
      ]
    };

    getProjectDetailServiceMock = {
      project: signal<GetProjectDetail | null>(options?.projectData === undefined ? defaultProjectData : options.projectData),
      loading: signal(options?.projectLoading ?? false),
      loadError: signal(options?.projectError ?? false),
      load: jest.fn().mockResolvedValue(undefined),
      invalidate: jest.fn()
    };

    apiMock = {
      GET_ResultsCount: jest.fn(),
      GET_Results: jest.fn().mockResolvedValue({
        data: {
          results: [
            { result_status: { result_status_id: 2, name: 'Submitted', config: { color: { text: 'var(--ac-primary-blue-600)' } } } },
            { result_status: { result_status_id: 2, name: 'Submitted', config: { color: { text: 'var(--ac-primary-blue-600)' } } } },
            { result_status: { result_status_id: 1 } },
            { result_status: { result_status_id: 'invalid' } }
          ]
        }
      }),
      GET_ContractResultsSummary: jest.fn()
    };

    contractResultsSummaryMock = {
      list: signal<ContractResultsSummary | null>(options?.summary === undefined ? null : options.summary),
      loading: signal(options?.summaryLoading ?? false),
      loadError: signal(options?.summaryError ?? false),
      main: jest.fn(),
      update: jest.fn()
    };

    const contractSpAlignmentMock = {
      list: signal<ContractSpAlignmentReport | null>(null),
      loading: signal(false),
      loadError: signal(false),
      main: jest.fn(),
      update: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProjectDashboardComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { parent: { snapshot: { paramMap: convertToParamMap(contractId ? { id: contractId } : {}) } } } },
        { provide: ApiService, useValue: apiMock },
        { provide: GetProjectDetailService, useValue: getProjectDetailServiceMock },
        {
          provide: ProjectUtilsService,
          useValue: {
            getLeverName: jest.fn().mockReturnValue('Lever name'),
            sortIndicators: jest.fn((items: any[]) => items)
          }
        },
        { provide: ResultsCenterService, useValue: resultsCenterServiceMock },
        { provide: FileManagerService, useValue: fileManagerServiceMock },
        { provide: DocumentOverviewService, useValue: documentOverviewServiceMock },
        { provide: RolesService, useValue: rolesServiceMock },
        { provide: ActionsService, useValue: actionsServiceMock }
      ]
    })
      .overrideComponent(ProjectDashboardComponent, {
        remove: {
          imports: [ProjectDashboardCardComponent, GeoScopeCardComponent, ResultsCenterTableComponent, ResultsTrendCardComponent, SpAlignmentGraphComponent],
          providers: [
            GetTopContributorsContractsService,
            GetTopMainContactPersonsService,
            GetTopPartnersService,
            GetTopPrimaryLeversService,
            GetGeoScopeService,
            GetContractResultsSummaryService,
            GetContractSpAlignmentService
          ]
        },
        add: {
          imports: [ProjectDashboardCardStubComponent, GeoScopeCardStubComponent, ResultsCenterTableStubComponent, ResultsTrendCardStubComponent, SpAlignmentGraphStubComponent],
          providers: [
            { provide: GetTopContributorsContractsService, useValue: topContributorsMock },
            { provide: GetTopMainContactPersonsService, useValue: topMainContactsMock },
            { provide: GetTopPartnersService, useValue: topPartnersMock },
            { provide: GetTopPrimaryLeversService, useValue: topLeversMock },
            { provide: GetGeoScopeService, useValue: geoScopeMock },
            { provide: GetContractResultsSummaryService, useValue: contractResultsSummaryMock },
            { provide: GetContractSpAlignmentService, useValue: contractSpAlignmentMock }
          ]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(ProjectDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should load project dashboard data for the parent contract via the shared service and summary aggregate (not GET_ResultsCount or GET_Results bulk — R-PD-003 AC.2)', async () => {
    await setup();

    expect(getProjectDetailServiceMock.load).toHaveBeenCalledWith('C-1');
    expect(apiMock.GET_ResultsCount).not.toHaveBeenCalled();
    expect(apiMock.GET_Results).not.toHaveBeenCalled();
    expect(contractResultsSummaryMock.main).toHaveBeenCalledWith('C-1');
    expect(topContributorsMock.main).toHaveBeenCalledWith('C-1', 4);
    expect(topMainContactsMock.main).toHaveBeenCalledWith('C-1', 4);
    expect(topPartnersMock.main).toHaveBeenCalledWith('C-1', 4);
    expect(topLeversMock.main).toHaveBeenCalledWith('C-1', 4);
    expect(geoScopeMock.main).toHaveBeenCalledWith('C-1');
    expect(resultsCenterServiceMock.initializeProjectDashboardResultsTable).toHaveBeenCalledWith('C-1');
  });

  it('should compute project summaries and formatted labels', async () => {
    await setup();

    expect(component.indicatorSummaries().map(item => item.label)).toEqual(['Fallback indicator', 'Output', 'Indicator']);
    expect(component.totalProjectResults()).toBe(6);
    expect(component.indicatorsWithResults().map(item => item.value)).toEqual([4, 2]);
    expect(component.indicatorSharePercent(3)).toBe(50);
  });

  it('should handle empty project response and empty contract id', async () => {
    await setup(null);

    expect(getProjectDetailServiceMock.load).not.toHaveBeenCalled();
    expect(apiMock.GET_ResultsCount).not.toHaveBeenCalled();
    expect(component.contractId()).toBe('');
    expect(component.indicatorSharePercent(1)).toBe(0);
  });

  it('should set null project when the shared service has no project data (null contract — D-PD-7)', async () => {
    await setup('C-1', { projectData: null });

    expect(component.project()).toBeNull();
  });

  it('should build and sort ranked service items', async () => {
    await setup();

    topContributorsMock.list.set([
      { contract_code: 'C-2', contract_description: 'Contributor', results_count: 1 },
      { project_name: 'Only project', count: 3 },
      { contract_id: 'C-3' },
      {}
    ]);
    topMainContactsMock.list.set([
      { name: 'Named', results_count: 1, email: 'named@example.com' },
      { full_name: 'Full Name', count: 2 },
      { contact_person_name: 'Contact Name', value: 3 },
      { label: 'Label Name' },
      { first_name: 'First', last_name: 'Last' },
      {}
    ]);
    topPartnersMock.list.set([
      { institution_id: 2, acronym: 'ABC', institution_name: 'Institution', results_count: 1 },
      { institution_id: null, partner_name: 'Partner', count: 2 },
      { institution_id: undefined, count: 3 },
      {}
    ]);
    topLeversMock.list.set([
      { lever_id: 1, short_name: 'RA', full_name: 'RA: Research area', count: 1, icon: 'icon.svg' },
      { lever_id: 2, short_name: 'L', full_name: 'L:', count: 3 },
      { lever_id: 3, short_name: '', full_name: '', count: 2 }
    ]);

    expect(component.contributorItems().map(item => item.label)).toEqual(['Only project', 'C-2 - Contributor', 'C-3', '—']);
    expect(component.mainContactPersonItems().map(item => item.label)).toEqual([
      'Contact Name',
      'Full Name',
      'Named',
      'Label Name',
      'First Last',
      '—'
    ]);
    expect(component.partnerItems().map(item => item.id)).toEqual(['2', 'Partner', '2', '3']);
    expect(component.partnerItems().map(item => item.label)).toContain('ABC - Institution');
    expect(component.leverItems().map(item => item.label)).toEqual(['L', '—', 'RA - RESEARCH AREA']);
  });

  it('should handle lever labels with empty prefixes (status region now fed by the aggregate — old bulk-fetch path removed)', async () => {
    await setup();

    topLeversMock.list.set([{ lever_id: 4, short_name: 'RA', full_name: ': Research area', count: 1 }]);
    expect(component.leverItems()[0].label).toBe('RA - RESEARCH AREA');
  });

  it('should compute empty states from loading, error, and list signals', async () => {
    await setup();

    expect(component.contributorsEmpty()).toBe(true);
    expect(component.mainContactPersonsEmpty()).toBe(true);
    expect(component.partnersEmpty()).toBe(true);
    expect(component.leversEmpty()).toBe(true);

    topContributorsMock.loading.set(true);
    topMainContactsMock.loadError.set(true);
    topPartnersMock.list.set([{}]);
    topLeversMock.list.set([{}]);

    expect(component.contributorsEmpty()).toBe(false);
    expect(component.mainContactPersonsEmpty()).toBe(false);
    expect(component.partnersEmpty()).toBe(false);
    expect(component.leversEmpty()).toBe(false);
  });

  describe('status region — aggregate-fed (R-PD-003, R-PD-007, R-PD-009)', () => {
    const sevenBuckets: ContractResultsSummary = {
      total: 40,
      by_status: [
        { status_id: 6, name: 'Approved', count: 10 },
        { status_id: 2, name: 'Submitted', count: 8 },
        { status_id: 4, name: 'Draft', count: 6 },
        { status_id: 5, name: 'Revised', count: 5 },
        { status_id: 7, name: 'Rejected', count: 4 },
        { status_id: 99, name: 'Custom Status', count: 3 },
        { status_id: null, name: 'No status', count: 4 }
      ],
      by_year: [],
      partner_institutions: 0
    };

    it('should issue no GET_Results request from this page (R-PD-003 AC.2 / BUT clause)', async () => {
      await setup('C-1', { summary: sevenBuckets });

      expect(apiMock.GET_Results).not.toHaveBeenCalled();
    });

    it('should feed the status region from the aggregate by_status (not from a bulk GET_Results fetch)', async () => {
      await setup('C-1', { summary: sevenBuckets });

      expect(component.statusBuckets().length).toBe(7);
      expect(component.statusTotal()).toBe(40);
      expect(component.statusChartEmpty()).toBe(false);
    });

    it('should render every returned status in the DOM — no scroll cap (R-PD-003 AND IT MUST render every returned status)', async () => {
      await setup('C-1', { summary: sevenBuckets });

      const rows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(rows.length).toBe(7);

      const scrollCap = fixture.nativeElement.querySelector('[class*="max-h-"]');
      expect(scrollCap?.classList.toString() ?? '').not.toContain('max-h-');
    });

    it('should compute share percentages that sum to 100 (±1 rounding) (R-PD-003 AC.1)', async () => {
      await setup('C-1', { summary: sevenBuckets });

      const sum = component.statusBuckets().reduce((acc, bucket) => acc + component.statusSharePercent(bucket.count), 0);
      expect(Math.abs(sum - 100)).toBeLessThanOrEqual(1);
    });

    it('should map status ids to semantic --ac-viz-* token names (D-PD-3) — no hex fallback', async () => {
      await setup('C-1', { summary: sevenBuckets });

      expect(component.statusTokenName(6)).toBe('--ac-viz-status-approved');
      expect(component.statusTokenName(2)).toBe('--ac-viz-status-submitted');
      expect(component.statusTokenName(4)).toBe('--ac-viz-status-draft');
      expect(component.statusTokenName(5)).toBe('--ac-viz-status-pending');
      expect(component.statusTokenName(7)).toBe('--ac-viz-status-rejected');
      expect(component.statusTokenName(null)).toBe('--ac-viz-status-no-status');
      expect(component.statusTokenName(99)).toBe('--ac-grey-500');
      expect(component.statusColor(6)).toBe('var(--ac-viz-status-approved)');
    });

    it('should expose role="img" + aria-label summarizing the split (R-PD-009 AC.1) and a table data alternative', async () => {
      await setup('C-1', { summary: sevenBuckets });

      const figure = fixture.nativeElement.querySelector('figure[role="img"]');
      expect(figure?.getAttribute('aria-label')).toContain('Results by status out of 40 total');
      expect(figure?.getAttribute('aria-label')).toContain('approved');

      const table = fixture.nativeElement.querySelector('table');
      expect(table).toBeTruthy();
      expect(table?.querySelector('caption')?.textContent).toContain('Results by status');
    });

    it('should render a drill link per row (T-11 shape — <a> with statusTab queryParams, R-PD-009 AC.2)', async () => {
      await setup('C-1', { summary: sevenBuckets });

      const links = fixture.nativeElement.querySelectorAll('tbody tr a[href]');
      expect(links.length).toBe(7);

      const firstLink = links[0];
      expect(firstLink.getAttribute('aria-label')).toContain('Approved');
      expect(firstLink.getAttribute('aria-label')).toContain('view filtered results');
    });

    it('should show a skeleton state while loading and transition to data (KZ-015 — arrange the transition, not the end state)', async () => {
      await setup('C-1', { summary: null, summaryLoading: true });
      expect(component.statusChartLoading()).toBe(true);

      const skeleton = fixture.nativeElement.querySelector('p-skeleton');
      expect(skeleton).toBeTruthy();

      contractResultsSummaryMock.loading.set(false);
      contractResultsSummaryMock.list.set(sevenBuckets);
      fixture.detectChanges();

      expect(component.statusChartLoading()).toBe(false);
      expect(component.statusBuckets().length).toBe(7);
    });

    it('should show an error state with a Retry control distinct from the empty copy (R-PD-007 error≠empty Scenario)', async () => {
      await setup('C-1', { summary: null, summaryLoading: true });
      contractResultsSummaryMock.loading.set(false);
      contractResultsSummaryMock.loadError.set(true);
      fixture.detectChanges();

      const errorRegion = fixture.nativeElement.querySelector('[role="alert"]');
      expect(errorRegion).toBeTruthy();
      expect(errorRegion.textContent).toContain('We could not load the status breakdown');

      const retryButton = errorRegion.querySelector('button');
      expect(retryButton).toBeTruthy();
      retryButton.click();
      expect(contractResultsSummaryMock.update).toHaveBeenCalled();

      const emptyRegion = fixture.nativeElement.querySelector('[role="alert"]');
      const emptyCopy = 'No result statuses were found for this project.';
      expect(errorRegion.textContent).not.toContain(emptyCopy);
    });

    it('should show the empty state with distinct copy when the aggregate returns no statuses (R-PD-007)', async () => {
      await setup('C-1', {
        summary: { total: 0, by_status: [], by_year: [], partner_institutions: 0 }
      });

      expect(component.statusChartEmpty()).toBe(true);

      const section = fixture.nativeElement.querySelector('section[aria-labelledby="results-by-status-title"]');
      expect(section.textContent).toContain('No result statuses were found for this project.');
      expect(section.textContent).not.toContain('We could not load the status breakdown');
    });
  });

  it('should compute zero share when indicator value is not positive', async () => {
    await setup();

    expect(component.indicatorSharePercent(0)).toBe(0);
  });

  describe('grounding and executive overview', () => {
    it('should format grounded docs badge for singular and plural counts', async () => {
      await setup();
      component.groundedDocuments.set([]);

      expect(component.groundedDocumentsCountColor()).toBe('var(--ac-grey-600)');

      component.groundedDocuments.set([{ fileName: 'a.pdf', fileKey: 'folder/a.pdf' }]);
      expect(component.groundedDocumentsCountColor()).toBe('var(--ac-green-500)');
      expect(component.hasGroundedDocuments()).toBe(true);
      expect(component.canUploadMoreGroundingDocs()).toBe(true);

      component.groundedDocuments.set([
        { fileName: 'a.pdf', fileKey: 'folder/a.pdf' },
        { fileName: 'b.pdf', fileKey: 'folder/b.pdf' },
        { fileName: 'c.pdf', fileKey: 'folder/c.pdf' }
      ]);
      expect(component.groundedDocumentsCountColor()).toBe('var(--ac-red-1)');
      expect(component.canUploadMoreGroundingDocs()).toBe(false);
    });

    it('should allow grounding setup only for center admin and system admin', async () => {
      await setup();

      expect(component.canAccessGroundingSetup()).toBe(true);
    });

    it('should hide grounding setup for non-admin users', async () => {
      await setup('C-1', { isAdmin: false });

      expect(component.canAccessGroundingSetup()).toBe(false);
    });

    it('should load stored executive overview summary and documents on dashboard init', async () => {
      await setup();

      expect(documentOverviewServiceMock.fetchDocumentOverviewSummary).toHaveBeenCalledWith('C-1');
      expect(documentOverviewServiceMock.generateDocumentOverview).not.toHaveBeenCalled();
      expect(component.executiveOverviewParagraphs()).toEqual([
        'Stored overview paragraph.',
        'Second stored paragraph.'
      ]);
      expect(component.groundedDocuments()).toEqual([
        {
          fileName: 'stored-file.pdf',
          fileKey: 'star/ai-insights/test/project-overview/projects/C-1/stored-file.pdf'
        }
      ]);
      expect(component.overviewSourceDocuments()).toEqual([
        {
          fileName: 'stored-file.pdf',
          fileKey: 'star/ai-insights/test/project-overview/projects/C-1/stored-file.pdf'
        }
      ]);
      expect(component.executiveOverviewGeneratedAt()).toBe('2026-07-09T20:10:56.921192+00:00');
      expect(component.showExecutiveOverview()).toBe(true);
    });

    it('should load executive overview summary for non-admin users when data exists', async () => {
      await setup('C-1', { isAdmin: false });

      expect(documentOverviewServiceMock.fetchDocumentOverviewSummary).toHaveBeenCalledWith('C-1');
      expect(component.canAccessGroundingSetup()).toBe(false);
      expect(component.executiveOverviewParagraphs()).toEqual([
        'Stored overview paragraph.',
        'Second stored paragraph.'
      ]);
      expect(component.showExecutiveOverview()).toBe(true);
    });

    it('should hide executive overview for non-admin users when no data exists', async () => {
      await setup('C-1', { isAdmin: false, emptyOverview: true });

      expect(documentOverviewServiceMock.fetchDocumentOverviewSummary).toHaveBeenCalledWith('C-1');
      expect(component.showExecutiveOverview()).toBe(false);
    });

    it('should block grounding upload actions for non-admin users', async () => {
      await setup('C-1', { isAdmin: false });
      const fileInput = document.createElement('input');
      const clickSpy = jest.spyOn(fileInput, 'click');

      component.triggerGroundingUpload(fileInput);
      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('contract.pdf')])
      } as unknown as Event);
      await component.generateExecutiveOverview();

      expect(clickSpy).not.toHaveBeenCalled();
      expect(fileManagerServiceMock.uploadFile).not.toHaveBeenCalled();
      expect(documentOverviewServiceMock.generateDocumentOverview).not.toHaveBeenCalled();
    });

    it('should upload grounding files without generating executive overview', async () => {
      await setup();
      component.groundedDocuments.set([]);
      documentOverviewServiceMock.fetchDocumentOverviewSummary.mockClear();

      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('contract.pdf')])
      } as unknown as Event);

      expect(fileManagerServiceMock.uploadFile).toHaveBeenCalledTimes(1);
      expect(documentOverviewServiceMock.generateDocumentOverview).not.toHaveBeenCalled();
      expect(component.groundedDocuments()).toEqual([
        {
          fileName: 'contract.pdf',
          fileKey: expect.stringContaining('stored-file.pdf')
        }
      ]);
      expect(component.uploadingGroundingDoc()).toBe(false);
    });

    it('should generate executive overview when generate is clicked', async () => {
      await setup();
      component.groundedDocuments.set([{ fileName: 'contract.pdf', fileKey: 'folder/contract.pdf' }]);
      documentOverviewServiceMock.generateDocumentOverview.mockClear();

      await component.generateExecutiveOverview();

      expect(documentOverviewServiceMock.generateDocumentOverview).toHaveBeenCalledWith('C-1');
      expect(fileManagerServiceMock.uploadFile).not.toHaveBeenCalled();
      expect(component.executiveOverviewParagraphs()).toEqual([
        'First overview paragraph.',
        'Second overview paragraph.'
      ]);
      expect(component.groundedDocuments()).toEqual([
        {
          fileName: 'contract.pdf',
          fileKey: 'star/ai-insights/test/project-overview/projects/C-1/stored-file.pdf'
        }
      ]);
      expect(component.overviewSourceDocuments()).toEqual([
        {
          fileName: 'contract.pdf',
          fileKey: 'star/ai-insights/test/project-overview/projects/C-1/stored-file.pdf'
        }
      ]);
      expect(component.executiveOverviewGeneratedAt()).toBe('2026-07-10T14:05:25.094Z');
      expect(component.executiveOverviewLoading()).toBe(false);
      expect(component.executiveOverviewError()).toBe(false);
    });

    it('should set executive overview error when document overview generation fails', async () => {
      await setup();
      component.groundedDocuments.set([{ fileName: 'contract.pdf', fileKey: 'folder/contract.pdf' }]);
      documentOverviewServiceMock.generateDocumentOverview.mockRejectedValueOnce(new Error('overview failed'));

      await component.generateExecutiveOverview();

      expect(component.executiveOverviewError()).toBe(true);
      expect(component.executiveOverviewLoading()).toBe(false);
    });

    it('should skip executive overview generation when contract id is missing', async () => {
      await setup(null);
      component.groundedDocuments.set([{ fileName: 'a.pdf', fileKey: 'folder/a.pdf' }]);
      documentOverviewServiceMock.generateDocumentOverview.mockClear();

      await component.generateExecutiveOverview();

      expect(documentOverviewServiceMock.generateDocumentOverview).not.toHaveBeenCalled();
    });

    it('should show a confirmation modal before removing a grounded document', async () => {
      await setup();
      component.groundedDocuments.set([
        { fileName: 'a.pdf', fileKey: 'folder/a.pdf' },
        { fileName: 'b.pdf', fileKey: 'folder/b.pdf' }
      ]);
      component.executiveOverviewParagraphs.set(['Existing overview']);
      component.executiveOverviewGeneratedAt.set('2026-07-09T20:10:56.921192+00:00');
      component.overviewSourceDocuments.set([{ fileName: 'a.pdf', fileKey: 'folder/a.pdf' }]);

      component.removeGroundingDocument('folder/a.pdf');

      expect(actionsServiceMock.showGlobalAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warning',
          summary: 'Remove document',
          icon: 'pi pi-exclamation-triangle',
          color: 'var(--ac-viz-status-pending)',
          confirmCallback: expect.objectContaining({ label: 'Continue' }),
          cancelCallback: expect.objectContaining({ label: 'Cancel' })
        })
      );
      expect(documentOverviewServiceMock.deleteDocumentOverviewFiles).not.toHaveBeenCalled();
    });

    it('should remove a grounded document from the list after confirmation', async () => {
      await setup();
      component.groundedDocuments.set([
        { fileName: 'a.pdf', fileKey: 'folder/a.pdf' },
        { fileName: 'b.pdf', fileKey: 'folder/b.pdf' }
      ]);
      component.executiveOverviewParagraphs.set(['Existing overview']);
      component.executiveOverviewGeneratedAt.set('2026-07-09T20:10:56.921192+00:00');
      component.overviewSourceDocuments.set([{ fileName: 'a.pdf', fileKey: 'folder/a.pdf' }]);

      component.removeGroundingDocument('folder/a.pdf');
      const alertConfig = actionsServiceMock.showGlobalAlert.mock.calls[0][0];
      await alertConfig.confirmCallback.event();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(documentOverviewServiceMock.deleteDocumentOverviewFiles).toHaveBeenCalledWith('C-1', ['a.pdf']);
      expect(component.groundedDocuments()).toEqual([{ fileName: 'b.pdf', fileKey: 'folder/b.pdf' }]);
      expect(component.executiveOverviewParagraphs()).toEqual(['Existing overview']);
      expect(component.executiveOverviewGeneratedAt()).toBe('2026-07-09T20:10:56.921192+00:00');
      expect(component.overviewSourceDocuments()).toEqual([{ fileName: 'a.pdf', fileKey: 'folder/a.pdf' }]);
    });

    it('should keep the grounded document when delete request fails', async () => {
      await setup();
      documentOverviewServiceMock.deleteDocumentOverviewFiles.mockRejectedValueOnce(new Error('delete failed'));
      component.groundedDocuments.set([
        { fileName: 'a.pdf', fileKey: 'folder/a.pdf' },
        { fileName: 'b.pdf', fileKey: 'folder/b.pdf' }
      ]);

      component.removeGroundingDocument('folder/a.pdf');
      const alertConfig = actionsServiceMock.showGlobalAlert.mock.calls[0][0];
      await alertConfig.confirmCallback.event();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'Remove failed'
        })
      );
      expect(component.groundedDocuments()).toEqual([
        { fileName: 'a.pdf', fileKey: 'folder/a.pdf' },
        { fileName: 'b.pdf', fileKey: 'folder/b.pdf' }
      ]);
    });

    it('should trigger grounding upload when slots are available', async () => {
      await setup();
      const fileInput = document.createElement('input');
      const clickSpy = jest.spyOn(fileInput, 'click');

      component.triggerGroundingUpload(fileInput);

      expect(fileInput.value).toBe('');
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should not trigger grounding upload when limit reached or upload in progress', async () => {
      await setup();
      const fileInput = document.createElement('input');
      const clickSpy = jest.spyOn(fileInput, 'click');

      component.groundedDocuments.set([
        { fileName: 'a.pdf', fileKey: 'folder/a.pdf' },
        { fileName: 'b.pdf', fileKey: 'folder/b.pdf' },
        { fileName: 'c.pdf', fileKey: 'folder/c.pdf' }
      ]);
      component.triggerGroundingUpload(fileInput);
      expect(clickSpy).not.toHaveBeenCalled();

      component.groundedDocuments.set([]);
      component.uploadingGroundingDoc.set(true);
      component.triggerGroundingUpload(fileInput);
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('should ignore empty file selection', async () => {
      await setup();

      await component.onGroundingFilesSelected({ target: createFileInput([]) } as unknown as Event);

      expect(fileManagerServiceMock.uploadFile).not.toHaveBeenCalled();
    });

    it('should warn when upload limit is already reached', async () => {
      await setup();
      component.groundedDocuments.set([
        { fileName: 'a.pdf', fileKey: 'folder/a.pdf' },
        { fileName: 'b.pdf', fileKey: 'folder/b.pdf' },
        { fileName: 'c.pdf', fileKey: 'folder/c.pdf' }
      ]);

      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('extra.pdf')])
      } as unknown as Event);

      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warning', summary: 'Upload limit reached' })
      );
      expect(fileManagerServiceMock.uploadFile).not.toHaveBeenCalled();
    });

    it('should upload valid grounding files and pass project id to file manager', async () => {
      await setup();
      component.groundedDocuments.set([]);

      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('contract.pdf'), createFile('scope.docx')])
      } as unknown as Event);

      expect(fileManagerServiceMock.uploadFile).toHaveBeenCalledTimes(2);
      expect(fileManagerServiceMock.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'contract.pdf' }),
        10,
        100,
        { projectId: 'C-1' }
      );
      expect(component.groundedDocuments()).toEqual([
        { fileName: 'contract.pdf', fileKey: expect.stringContaining('stored-file.pdf') },
        { fileName: 'scope.docx', fileKey: expect.stringContaining('stored-file.pdf') }
      ]);
      expect(component.uploadingGroundingDoc()).toBe(false);
    });

    it('should trim selected files to remaining slots and show singular limit toast', async () => {
      await setup();
      component.groundedDocuments.set([
        { fileName: 'a.pdf', fileKey: 'folder/a.pdf' },
        { fileName: 'b.pdf', fileKey: 'folder/b.pdf' }
      ]);

      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('one.pdf'), createFile('two.pdf')])
      } as unknown as Event);

      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'info',
          detail: 'Only 1 more document can be uploaded.'
        })
      );
      expect(fileManagerServiceMock.uploadFile).toHaveBeenCalledTimes(1);
    });

    it('should reject unsupported and oversized grounding files', async () => {
      await setup();

      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('bad.exe'), createFile('huge.pdf', 11 * 1024 * 1024)])
      } as unknown as Event);

      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warning', summary: 'Unsupported file' })
      );
      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warning', summary: 'File too large' })
      );
      expect(fileManagerServiceMock.uploadFile).not.toHaveBeenCalled();
    });

    it('should show plural limit toast when multiple slots remain', async () => {
      await setup();
      component.groundedDocuments.set([{ fileName: 'a.pdf', fileKey: 'folder/a.pdf' }]);

      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('one.pdf'), createFile('two.pdf'), createFile('three.pdf')])
      } as unknown as Event);

      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'info',
          detail: 'Only 2 more documents can be uploaded.'
        })
      );
    });

    it('should handle file inputs without a files collection', async () => {
      await setup();
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', { value: null });

      await component.onGroundingFilesSelected({ target: input } as unknown as Event);

      expect(fileManagerServiceMock.uploadFile).not.toHaveBeenCalled();
    });

    it('should treat files without an extension as unsupported', async () => {
      await setup();
      const splitSpy = jest.spyOn(String.prototype, 'split').mockReturnValueOnce([] as unknown as string[]);

      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('no-extension')])
      } as unknown as Event);

      expect(splitSpy).toHaveBeenCalled();
      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warning', summary: 'Unsupported file' })
      );
      splitSpy.mockRestore();
    });

    it('should show error toast when upload fails or filename is missing', async () => {
      await setup();

      fileManagerServiceMock.uploadFile.mockRejectedValueOnce(new Error('upload failed'));
      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('fail.pdf')])
      } as unknown as Event);
      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', summary: 'Upload failed' })
      );

      fileManagerServiceMock.uploadFile.mockResolvedValueOnce({ data: { filename: '' } });
      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('missing-name.pdf')])
      } as unknown as Event);
      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', summary: 'Upload failed' })
      );
    });

    it('should skip remove confirmation for non-admin users', async () => {
      await setup('C-1', { isAdmin: false });
      component.groundedDocuments.set([{ fileName: 'a.pdf', fileKey: 'folder/a.pdf' }]);

      component.removeGroundingDocument('folder/a.pdf');

      expect(actionsServiceMock.showGlobalAlert).not.toHaveBeenCalled();
    });

    it('should skip remove confirmation when the document does not exist', async () => {
      await setup();

      component.removeGroundingDocument('missing-key');

      expect(actionsServiceMock.showGlobalAlert).not.toHaveBeenCalled();
    });

    it('should skip async document removal when project id is missing', async () => {
      await setup(null);
      component.groundedDocuments.set([{ fileName: 'a.pdf', fileKey: 'folder/a.pdf' }]);

      await (component as any).removeGroundingDocumentAsync('folder/a.pdf');

      expect(documentOverviewServiceMock.deleteDocumentOverviewFiles).not.toHaveBeenCalled();
    });

    it('should skip async document removal when document is no longer in the list', async () => {
      await setup();

      await (component as any).removeGroundingDocumentAsync('missing-key');

      expect(documentOverviewServiceMock.deleteDocumentOverviewFiles).not.toHaveBeenCalled();
    });

    it('should skip loading executive overview summary when project id is missing', async () => {
      await setup(null);
      documentOverviewServiceMock.fetchDocumentOverviewSummary.mockClear();

      await (component as any).loadExecutiveOverviewSummary();

      expect(documentOverviewServiceMock.fetchDocumentOverviewSummary).not.toHaveBeenCalled();
    });

    it('should clear executive overview when summary fetch fails', async () => {
      await setup('C-1', { rejectOverviewFetch: true });

      expect(component.executiveOverviewParagraphs()).toEqual([]);
      expect(component.groundedDocuments()).toEqual([]);
      expect(component.overviewSourceDocuments()).toEqual([]);
      expect(component.executiveOverviewGeneratedAt()).toBeNull();
      expect(component.executiveOverviewLoading()).toBe(false);
    });
  });

  describe('KPI strip (R-PD-002, R-PD-008, W7, S2)', () => {
    it('should render values for all 4 KPI tiles when data is loaded (R-PD-002 AC.1)', async () => {
      await setup('C-1', {
        projectData: {
          agreement_id: 'A1676',
          divisionId: 'D1',
          division: 'Division',
          unitId: 'U1',
          unit: 'Unit',
          grant_amount: 1000,
          indicators: [
            { indicator: { indicator_id: 1, name: 'Publications' }, count_results: 10 } as any,
            { indicator: { indicator_id: 2, name: 'Innovations' }, count_results: 5 } as any,
            { indicator: { indicator_id: 3, name: 'Policies' }, count_results: 0 } as any
          ]
        },
        summary: {
          total: 15,
          by_status: [
            { status_id: 6, name: 'Approved', count: 12 },
            { status_id: 5, name: 'Pending revision', count: 3 }
          ],
          by_year: [{ year: 2024, count: 15 }],
          partner_institutions: 24
        }
      });

      const kpiRegion = fixture.nativeElement.querySelector('[role="region"][aria-label="Key performance indicators"]');
      expect(kpiRegion).not.toBeNull();

      const text = kpiRegion.textContent;
      expect(text).toContain('Total results');
      expect(text).toContain('15');
      expect(text).toContain('Indicators covered');
      expect(text).toContain('2');
      expect(text).toContain('of 3 indicator types');
      expect(text).toContain('Pending revision');
      expect(text).toContain('3');
      expect(text).toContain('Review queue');
      expect(text).toContain('Partner institutions');
      expect(text).toContain('24');
    });

    it('should render partner institutions from aggregate partner_institutions and not top-4 list length (S2)', async () => {
      await setup('C-1', {
        summary: {
          total: 50,
          by_status: [],
          by_year: [],
          partner_institutions: 42
        }
      });

      const kpiRegion = fixture.nativeElement.querySelector('[role="region"][aria-label="Key performance indicators"]');
      expect(kpiRegion.textContent).toContain('42');
    });

    it('should show skeletons and NOT 0 while project data is in flight (R-PD-002 BUT clause / KZ-015)', async () => {
      await setup('C-1', { projectLoading: true, projectData: null });

      const totalResultsSkeleton = fixture.nativeElement.querySelector('[aria-label="Loading total results"]');
      const indicatorsCoveredSkeleton = fixture.nativeElement.querySelector('[aria-label="Loading indicators covered"]');

      expect(totalResultsSkeleton).not.toBeNull();
      expect(indicatorsCoveredSkeleton).not.toBeNull();

      // Red input: must NOT display 0 during loading (R-PD-002 Scenario: No fabricated zeros)
      const kpiRegion = fixture.nativeElement.querySelector('[role="region"][aria-label="Key performance indicators"]');
      const tile1 = kpiRegion.children[0];
      expect(tile1.querySelector('strong')).toBeNull();

      // Transition to data
      const newProject = {
        agreement_id: 'C-1',
        grant_amount: 100,
        divisionId: 'D1',
        division: 'Division',
        unitId: 'U1',
        unit: 'Unit',
        indicators: [{ indicator: { indicator_id: 1, name: 'Publications' }, count_results: 8 } as any]
      };
      getProjectDetailServiceMock.loading.set(false);
      getProjectDetailServiceMock.project.set(newProject);
      component.project.set(newProject);
      fixture.detectChanges();

      expect(tile1.querySelector('strong')?.textContent?.trim()).toBe('8');
      expect(fixture.nativeElement.querySelector('[aria-label="Loading total results"]')).toBeNull();
    });

    it('should show skeletons and NOT 0 while summary aggregate is in flight (R-PD-002 BUT clause / KZ-015)', async () => {
      await setup('C-1', { summaryLoading: true, summary: null });

      const pendingSkeleton = fixture.nativeElement.querySelector('[aria-label="Loading pending revision count"]');
      const partnersSkeleton = fixture.nativeElement.querySelector('[aria-label="Loading partner institutions count"]');

      expect(pendingSkeleton).not.toBeNull();
      expect(partnersSkeleton).not.toBeNull();

      const kpiRegion = fixture.nativeElement.querySelector('[role="region"][aria-label="Key performance indicators"]');
      const pendingTile = kpiRegion.children[2];
      expect(pendingTile.querySelector('strong')).toBeNull();

      // Transition to data
      contractResultsSummaryMock.loading.set(false);
      contractResultsSummaryMock.list.set({
        total: 10,
        by_status: [{ status_id: 5, name: 'Pending revision', count: 4 }],
        by_year: [],
        partner_institutions: 18
      });
      fixture.detectChanges();

      expect(pendingTile.querySelector('strong')?.textContent?.trim()).toBe('4');
      expect(fixture.nativeElement.querySelector('[aria-label="Loading pending revision count"]')).toBeNull();
    });

    it('should scroll smoothly to #pending-revision-section on Review queue click (R-PD-008, W7)', async () => {
      await setup('C-1', {
        summary: {
          total: 10,
          by_status: [{ status_id: 5, name: 'Pending revision', count: 2 }],
          by_year: [],
          partner_institutions: 5
        }
      });

      const targetSection = fixture.nativeElement.querySelector('#pending-revision-section');
      expect(targetSection).not.toBeNull();

      const scrollSpy = jest.fn();
      targetSection.scrollIntoView = scrollSpy;

      const reviewQueueLink: HTMLElement = fixture.nativeElement.querySelector('a[href="#pending-revision-section"]');
      expect(reviewQueueLink).not.toBeNull();

      reviewQueueLink.click();
      expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
    });

    it('should use behavior: auto when prefers-reduced-motion is active (W7)', async () => {
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = jest.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      } as unknown as MediaQueryList));

      await setup('C-1', {
        summary: {
          total: 10,
          by_status: [{ status_id: 5, name: 'Pending revision', count: 2 }],
          by_year: [],
          partner_institutions: 5
        }
      });

      const targetSection = fixture.nativeElement.querySelector('#pending-revision-section');
      const scrollSpy = jest.fn();
      targetSection.scrollIntoView = scrollSpy;

      component.scrollToPendingRevision();
      expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));

      window.matchMedia = originalMatchMedia;
    });
  });

  describe('Results by indicator region (R-PD-005, R-PD-007)', () => {
    it('should render skeleton and NOT empty copy while indicator data is loading (R-PD-005 AC.2 / BUT clause)', async () => {
      await setup('C-1', {
        projectLoading: true,
        projectData: null
      });

      const indicatorSection = fixture.nativeElement.querySelector('section[aria-labelledby="results-by-indicator-title"]');
      expect(indicatorSection).not.toBeNull();

      // Skeleton loading is present with role="status"
      const skeletonEl = indicatorSection.querySelector('[role="status"][aria-label="Loading results by indicator"]');
      expect(skeletonEl).not.toBeNull();
      expect(skeletonEl.querySelector('p-skeleton')).not.toBeNull();

      // Must NOT render empty copy while loading (R-PD-005 BUT clause)
      const emptyCopy = 'No results were found for any indicator on this project.';
      expect(indicatorSection.textContent).not.toContain(emptyCopy);
    });

    it('should render error state with retry button and re-invoke load on click (R-PD-007, R-PD-005)', async () => {
      await setup('C-1', {
        projectError: true,
        projectData: null
      });

      const indicatorSection = fixture.nativeElement.querySelector('section[aria-labelledby="results-by-indicator-title"]');
      expect(indicatorSection).not.toBeNull();

      const alertEl = indicatorSection.querySelector('[role="alert"]');
      expect(alertEl).not.toBeNull();
      expect(alertEl.textContent).toContain('We could not load results by indicator. Please try again.');

      const retrySpy = jest.spyOn(component, 'retryIndicatorBreakdown');
      const retryBtn = alertEl.querySelector('button');
      expect(retryBtn).not.toBeNull();
      retryBtn.click();

      expect(retrySpy).toHaveBeenCalled();
      expect(getProjectDetailServiceMock.invalidate).toHaveBeenCalledWith('C-1');
      expect(getProjectDetailServiceMock.load).toHaveBeenCalledWith('C-1');
    });

    it('should render distinct empty state copy when total project results is 0 and not loading/error (R-PD-007, R-PD-005)', async () => {
      await setup('C-1', {
        projectData: {
          grant_amount: 100,
          divisionId: 'D1',
          division: 'Division',
          unitId: 'U1',
          unit: 'Unit',
          indicators: []
        }
      });

      const indicatorSection = fixture.nativeElement.querySelector('section[aria-labelledby="results-by-indicator-title"]');
      expect(indicatorSection.textContent).toContain('No results were found for any indicator on this project.');
      expect(indicatorSection.textContent).not.toContain('We could not load results by indicator');
      expect(indicatorSection.querySelector('[role="status"]')).toBeNull();
      expect(indicatorSection.querySelector('[role="alert"]')).toBeNull();
    });

    it('should keep sibling cards rendering data when one region fails with loadError (R-PD-007 AC.2)', async () => {
      await setup('C-1', {
        projectData: {
          agreement_id: 'C-1',
          grant_amount: 500,
          divisionId: 'D1',
          division: 'Division',
          unitId: 'U1',
          unit: 'Unit',
          indicators: [
            { indicator: { indicator_id: 1, name: 'Publications' }, count_results: 5 } as any
          ]
        },
        summary: {
          total: 5,
          by_status: [{ status_id: 6, name: 'Approved', count: 5 }],
          by_year: [{ year: 2024, count: 5 }],
          partner_institutions: 3
        }
      });

      // Simulate topPartners failure
      topPartnersMock.loadError.set(true);
      topPartnersMock.loading.set(false);

      // Simulate topPrimaryLevers success
      topLeversMock.list.set([
        { lever_id: 1, short_name: 'L1', full_name: 'Lever 1', count: 4 }
      ]);
      topLeversMock.loading.set(false);
      topLeversMock.loadError.set(false);

      fixture.detectChanges();

      // topPartners is in error
      expect(topPartnersMock.loadError()).toBe(true);

      // Indicators card still displays data
      const indicatorSection = fixture.nativeElement.querySelector('section[aria-labelledby="results-by-indicator-title"]');
      expect(indicatorSection.textContent).toContain('Total results');
      expect(indicatorSection.textContent).toContain('5');
      expect(indicatorSection.textContent).toContain('Publications');

      // Status region still displays data
      const statusSection = fixture.nativeElement.querySelector('section[aria-labelledby="results-by-status-title"]');
      expect(statusSection.textContent).toContain('Approved');
      expect(statusSection.textContent).toContain('5');

      // Top levers card still has its data items
      expect(component.leverItems().length).toBe(1);
      expect(component.leverItems()[0].label).toBe('LEVER 1');
    });

    it('should have distinct copy strings for error and empty states across regions (R-PD-007 AC.1)', async () => {
      await setup();

      expect(component.contributorsEmpty()).toBe(true);
      expect(component.mainContactPersonsEmpty()).toBe(true);
      expect(component.partnersEmpty()).toBe(true);
      expect(component.leversEmpty()).toBe(true);
      expect(component.statusChartEmpty()).toBe(true);
    });

    it('should render indicator breakdown rows as accessible drill-through links (R-PD-005 Details, R-PD-008)', async () => {
      await setup('C-1', {
        projectData: {
          agreement_id: 'C-1',
          grant_amount: 500,
          divisionId: 'D1',
          division: 'Division',
          unitId: 'U1',
          unit: 'Unit',
          indicators: [
            { indicator: { indicator_id: 1, name: 'Publications' }, count_results: 8 } as any,
            { indicator: { indicator_id: 2, name: 'Innovations' }, count_results: 4 } as any
          ]
        }
      });

      const indicatorSection = fixture.nativeElement.querySelector('section[aria-labelledby="results-by-indicator-title"]');
      const links = indicatorSection.querySelectorAll('ul li a');
      expect(links.length).toBe(2);

      const firstLink = links[0];
      expect(firstLink.getAttribute('href')).toContain('/project-detail/C-1?indicatorTab=1');
      expect(firstLink.getAttribute('aria-label')).toContain('Publications: 8 results, 67% — view filtered results');
    });

    describe('T-12 hierarchy and AI section relocation (R-PD-008, D-PD-8, D-PD-9)', () => {
      it('should toggle caveat banner expansion (D-PD-8)', async () => {
        await setup();

        expect(component.isCaveatExpanded()).toBe(false);
        const toggleBtn = fixture.nativeElement.querySelector('button[aria-controls="dashboard-caveat-details"]');
        expect(toggleBtn).toBeTruthy();
        expect(toggleBtn.textContent.trim()).toBe('Learn more');
        expect(fixture.nativeElement.querySelector('#dashboard-caveat-details')).toBeNull();

        toggleBtn.click();
        fixture.detectChanges();

        expect(component.isCaveatExpanded()).toBe(true);
        expect(toggleBtn.textContent.trim()).toBe('Show less');
        expect(fixture.nativeElement.querySelector('#dashboard-caveat-details')).toBeTruthy();
      });

      it('should position KPI strip and analytics before AI grounding section in DOM order (D-PD-9)', async () => {
        await setup();
        component.groundedDocuments.set([{ fileName: 'doc.pdf', fileKey: 'k/doc.pdf' }]);
        fixture.detectChanges();

        const kpiRegion = fixture.nativeElement.querySelector('[role="region"][aria-label="Key performance indicators"]');
        const aiSection = fixture.nativeElement.querySelector('section[aria-labelledby="ai-grounding-section-title"]');

        expect(kpiRegion).toBeTruthy();
        expect(aiSection).toBeTruthy();

        // Node.DOCUMENT_POSITION_FOLLOWING (4): aiSection comes after kpiRegion in DOM
        const position = kpiRegion.compareDocumentPosition(aiSection);
        expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      });

      it('should preserve file input in DOM when AI panel is collapsed via [hidden] (D-PD-9)', async () => {
        await setup();
        component.groundedDocuments.set([{ fileName: 'doc.pdf', fileKey: 'k/doc.pdf' }]);
        component.isAiSectionExpanded.set(false);
        fixture.detectChanges();

        const fileInput = fixture.nativeElement.querySelector('#grounding-file-input');
        expect(fileInput).toBeTruthy();
        expect(fileInput.tagName.toLowerCase()).toBe('input');

        // Verify container is hidden but still in DOM
        const collapsibleContainer = fixture.nativeElement.querySelector('section[aria-labelledby="ai-grounding-section-title"] div[hidden]');
        expect(collapsibleContainer).toBeTruthy();
        expect(collapsibleContainer.hidden).toBe(true);
      });

      it('should show inline progress on collapsed AI header when generating (D-PD-9)', async () => {
        await setup();
        component.groundedDocuments.set([{ fileName: 'doc.pdf', fileKey: 'k/doc.pdf' }]);
        component.isAiSectionExpanded.set(false);
        component.executiveOverviewLoading.set(true);
        fixture.detectChanges();

        const headerStatus = fixture.nativeElement.querySelector('section[aria-labelledby="ai-grounding-section-title"] header [role="status"]');
        expect(headerStatus).toBeTruthy();
        expect(headerStatus.textContent).toContain('Generating summary…');
      });

      it('should auto-expand AI section when generateExecutiveOverview is called', async () => {
        await setup();
        component.groundedDocuments.set([{ fileName: 'doc.pdf', fileKey: 'k/doc.pdf' }]);
        component.isAiSectionExpanded.set(false);

        void component.generateExecutiveOverview();

        expect(component.isAiSectionExpanded()).toBe(true);
      });
    });
  });

  describe('SP alignment graph widget visibility (R-DA-003, D-DA-5, KZ-002)', () => {
    it('renders app-sp-alignment-graph for bilateral project (KZ-002 bilateral fixture)', async () => {
      await setup('C-1', {
        projectData: {
          funding_type: 'Bilateral',
          grant_amount: 1000,
          indicators: []
        }
      });

      expect(component.isBilateral()).toBe(true);
      const widget = fixture.nativeElement.querySelector('app-sp-alignment-graph');
      expect(widget).not.toBeNull();
    });

    it('does NOT render app-sp-alignment-graph for non-bilateral project (KZ-002 non-bilateral fixture)', async () => {
      await setup('C-1', {
        projectData: {
          funding_type: 'Pool Funding',
          grant_amount: 1000,
          indicators: []
        }
      });

      expect(component.isBilateral()).toBe(false);
      const widget = fixture.nativeElement.querySelector('app-sp-alignment-graph');
      expect(widget).toBeNull();
    });

    it('does NOT render app-sp-alignment-graph when project has active pooled funding relation (KZ-002)', async () => {
      await setup('C-1', {
        projectData: {
          funding_type: 'Bilateral',
          grant_amount: 1000,
          indicators: [],
          pooled_funding_contracts: [{ is_active: true }]
        } as any
      });

      expect(component.isBilateral()).toBe(false);
      expect(fixture.nativeElement.querySelector('app-sp-alignment-graph')).toBeNull();
    });
  });
});

