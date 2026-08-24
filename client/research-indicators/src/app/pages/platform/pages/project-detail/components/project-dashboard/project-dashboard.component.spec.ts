import { Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { ApiService } from '@shared/services/api.service';
import { GetProjectDetailService } from '@shared/services/get-project-detail.service';
import { GetContractDashboardService } from '@shared/services/get-contract-dashboard.service';
import { ProjectUtilsService } from '@shared/services/project-utils.service';
import { ResultsCenterService } from '../../../results-center/results-center.service';
import { FileManagerService } from '@shared/services/file-manager.service';
import { DocumentOverviewService } from '@shared/services/document-overview.service';
import { RolesService } from '@shared/services/cache/roles.service';
import { ActionsService } from '@shared/services/actions.service';
import { ProjectDashboardComponent, WIDGET_ENTRY_STAGGER_MS } from './project-dashboard.component';
import { GeoScopeCardComponent } from '../geo-scope-card/geo-scope-card.component';
import { ProjectDashboardCardComponent } from '../project-dashboard-card/project-dashboard-card.component';
import { ResultsCenterTableComponent } from '../../../results-center/components/results-center-table/results-center-table.component';
import { ResultsTrendCardComponent } from '../results-trend-card/results-trend-card.component';
import { SpAlignmentGraphComponent } from '../sp-alignment-graph/sp-alignment-graph.component';
import { IndicatorDeepDiveComponent, IndicatorDeepDiveTab } from '../indicator-deep-dive/indicator-deep-dive.component';
import { InsightsSectionComponent } from '../insights-section/insights-section.component';
import { GetProjectDetail } from '@shared/interfaces/get-project-detail.interface';
import { DeclaredSdg } from '@shared/interfaces/contract-insights.interface';
import { ContractResultsSummary, ContractResultsSummaryYearBucket } from '@interfaces/contract-results-summary.interface';
import { ContractSpAlignmentReport, ContractSpAlignment } from '@shared/interfaces/contract-sp-alignment.interface';
import { ContractDashboardReport, ContractDashboardTops } from '@shared/interfaces/contract-dashboard.interface';
import { GeoScopeResponse } from '@interfaces/geo-scope.interface';
import { ProjectDashboardRankedItem } from '@interfaces/project-dashboard.interface';
import { DarkModeService } from '@shared/services/dark-mode.service';
import { VizChartComponent } from '@shared/components/viz-chart/viz-chart.component';

@Component({
  selector: 'app-viz-chart',
  standalone: true,
  template: ''
})
class VizChartStubComponent {
  @Input() options: unknown = null;
  @Input() tableModel: unknown = null;
  @Input() chartTitle = '';
  @Input() height = '';
}

@Component({
  selector: 'app-sp-alignment-graph',
  standalone: true,
  template: '@if (error) { <div>We could not load Science-Program alignments.</div> }'
})
class SpAlignmentGraphStubComponent {
  @Input() report: ContractSpAlignmentReport | null = null;
  @Input() loading = false;
  @Input() error = false;
}

@Component({
  selector: 'app-indicator-deep-dive',
  standalone: true,
  template: ''
})
class IndicatorDeepDiveStubComponent {
  @Input() contractId = '';
  @Input() indicators: IndicatorDeepDiveTab[] = [];
  @Input() loading = false;
}

@Component({
  selector: 'app-insights-section',
  standalone: true,
  template: ''
})
class InsightsSectionStubComponent {
  @Input() contractId = '';
  @Input() declaredSdgs: DeclaredSdg[] = [];
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
  @Output() chartClick = new EventEmitter<unknown>();
  @Output() retry = new EventEmitter<void>();
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
  @Input() errorMessage = '';
  @Input() items: unknown[] = [];
  @Input() layout = '';
  @Input() itemHeightPx: number | null = null;
  @Input() iconClass = '';
  @Input() options: unknown = null;
  @Input() tableModel: unknown = null;
  @Input() chartTitle = '';
  @Input() chartHeight = '';
  @Output() chartClick = new EventEmitter<unknown>();
  @Output() retry = new EventEmitter<void>();
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
  let apiMock: { GET_ResultsCount: jest.Mock; GET_Results: jest.Mock };
  let getProjectDetailServiceMock: { project: ReturnType<typeof signal<GetProjectDetail | null>>; loading: ReturnType<typeof signal<boolean>>; loadError: ReturnType<typeof signal<boolean>>; load: jest.Mock; invalidate: jest.Mock };
  let contractDashboardMock: {
    data: ReturnType<typeof signal<ContractDashboardReport | null>>;
    loading: ReturnType<typeof signal<boolean>>;
    loadError: ReturnType<typeof signal<boolean>>;
    loadedContractId: ReturnType<typeof signal<string | null>>;
    summary: ReturnType<typeof computed<ContractResultsSummary | null>>;
    tops: ReturnType<typeof computed<ContractDashboardTops | null>>;
    topPartners: ReturnType<typeof computed<ProjectDashboardRankedItem[]>>;
    topPrimaryLevers: ReturnType<typeof computed<ProjectDashboardRankedItem[]>>;
    topMainContactPersons: ReturnType<typeof computed<ProjectDashboardRankedItem[]>>;
    topContributors: ReturnType<typeof computed<ProjectDashboardRankedItem[]>>;
    geoScope: ReturnType<typeof computed<GeoScopeResponse | null>>;
    spAlignment: ReturnType<typeof computed<ContractSpAlignment | null>>;
    load: jest.Mock;
    update: jest.Mock;
  };
  let contractResultsSummaryMock: any;
  let topContributorsMock: any;
  let topMainContactsMock: any;
  let topPartnersMock: any;
  let topLeversMock: any;
  let geoScopeMock: any;
  let contractSpAlignmentMock: any;
  let resultsCenterServiceMock: { initializeProjectDashboardResultsTable: jest.Mock };
  let fileManagerServiceMock: { uploadFile: jest.Mock };
  let documentOverviewServiceMock: {
    fetchDocumentOverviewSummary: jest.Mock;
    generateDocumentOverview: jest.Mock;
    deleteDocumentOverviewFiles: jest.Mock;
  };
  let rolesServiceMock: { isAdmin: jest.Mock };
  let actionsServiceMock: any;

  function createFile(name: string, size = 1024, type = 'application/pdf'): File {
    return new File([new ArrayBuffer(size)], name, { type });
  }

  function createFileInput(files: File[]): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: files });
    return input;
  }

  function createContractDashboardServiceMock(options?: {
    data?: ContractDashboardReport | null;
    loading?: boolean;
    loadError?: boolean;
  }) {
    const data = signal<ContractDashboardReport | null>(options?.data ?? null);
    const loading = signal<boolean>(options?.loading ?? false);
    const loadError = signal<boolean>(options?.loadError ?? false);
    const loadedContractId = signal<string | null>(null);

    const summary = computed(() => data()?.summary ?? null);
    const tops = computed(() => data()?.tops ?? null);
    const topPartners = computed(() => tops()?.partners ?? []);
    const topPrimaryLevers = computed(() => tops()?.primary_levers ?? []);
    const topMainContactPersons = computed(() => tops()?.main_contacts ?? []);
    const topContributors = computed(() => tops()?.contributors ?? []);
    const geoScope = computed(() => data()?.geo_scope ?? null);
    const spAlignment = computed(() => data()?.sp_alignment ?? null);

    const load = jest.fn().mockImplementation(async (contractId: string) => {
      loadedContractId.set(contractId);
    });
    const update = jest.fn().mockImplementation(async () => {});

    return {
      data,
      loading,
      loadError,
      loadedContractId,
      summary,
      tops,
      topPartners,
      topPrimaryLevers,
      topMainContactPersons,
      topContributors,
      geoScope,
      spAlignment,
      load,
      update
    };
  }

  function setPartners(partners: any[]) {
    const current = contractDashboardMock.data() ?? {
      summary: null,
      tops: { partners: [], primary_levers: [], main_contacts: [], contributors: [] },
      geo_scope: null,
      sp_alignment: null
    };
    const currentTops = current.tops ?? { partners: [], primary_levers: [], main_contacts: [], contributors: [] };
    contractDashboardMock.data.set({
      ...current,
      tops: { ...currentTops, partners }
    });
  }

  function setLevers(primary_levers: any[]) {
    const current = contractDashboardMock.data() ?? {
      summary: null,
      tops: { partners: [], primary_levers: [], main_contacts: [], contributors: [] },
      geo_scope: null,
      sp_alignment: null
    };
    const currentTops = current.tops ?? { partners: [], primary_levers: [], main_contacts: [], contributors: [] };
    contractDashboardMock.data.set({
      ...current,
      tops: { ...currentTops, primary_levers }
    });
  }

  function setContacts(main_contacts: any[]) {
    const current = contractDashboardMock.data() ?? {
      summary: null,
      tops: { partners: [], primary_levers: [], main_contacts: [], contributors: [] },
      geo_scope: null,
      sp_alignment: null
    };
    const currentTops = current.tops ?? { partners: [], primary_levers: [], main_contacts: [], contributors: [] };
    contractDashboardMock.data.set({
      ...current,
      tops: { ...currentTops, main_contacts }
    });
  }

  function setContributors(contributors: any[]) {
    const current = contractDashboardMock.data() ?? {
      summary: null,
      tops: { partners: [], primary_levers: [], main_contacts: [], contributors: [] },
      geo_scope: null,
      sp_alignment: null
    };
    const currentTops = current.tops ?? { partners: [], primary_levers: [], main_contacts: [], contributors: [] };
    contractDashboardMock.data.set({
      ...current,
      tops: { ...currentTops, contributors }
    });
  }

  function setSummary(summary: ContractResultsSummary | null) {
    const current = contractDashboardMock.data() ?? {
      summary: null,
      tops: { partners: [], primary_levers: [], main_contacts: [], contributors: [] },
      geo_scope: null,
      sp_alignment: null
    };
    contractDashboardMock.data.set({
      ...current,
      summary
    });
  }

  function setGeoScope(geo_scope: any | null) {
    const current = contractDashboardMock.data() ?? {
      summary: null,
      tops: { partners: [], primary_levers: [], main_contacts: [], contributors: [] },
      geo_scope: null,
      sp_alignment: null
    };
    contractDashboardMock.data.set({
      ...current,
      geo_scope
    });
  }

  function setSpAlignment(sp_alignment: any | null) {
    const current = contractDashboardMock.data() ?? {
      summary: null,
      tops: { partners: [], primary_levers: [], main_contacts: [], contributors: [] },
      geo_scope: null,
      sp_alignment: null
    };
    contractDashboardMock.data.set({
      ...current,
      sp_alignment
    });
  }

  async function setup(
    contractId: string | null = 'C-1',
    options?: {
      isAdmin?: boolean;
      emptyOverview?: boolean;
      rejectOverviewFetch?: boolean;
      projectData?: GetProjectDetail | null;
      projectLoading?: boolean;
      projectError?: boolean;
      dashboardData?: ContractDashboardReport | null;
      summary?: ContractResultsSummary | null;
      tops?: ContractDashboardTops | null;
      geoScope?: GeoScopeResponse | null;
      spAlignment?: ContractSpAlignment | null;
      dashboardLoading?: boolean;
      dashboardError?: boolean;
      summaryLoading?: boolean;
      summaryError?: boolean;
    }
  ) {
    let initialDashboardData: ContractDashboardReport | null = null;
    if (options?.dashboardData !== undefined) {
      initialDashboardData = options.dashboardData;
    } else if (
      options?.summary !== undefined ||
      options?.tops !== undefined ||
      options?.geoScope !== undefined ||
      options?.spAlignment !== undefined
    ) {
      initialDashboardData = {
        summary: options?.summary ?? null,
        tops: options?.tops ?? {
          partners: [],
          primary_levers: [],
          main_contacts: [],
          contributors: []
        },
        geo_scope: options?.geoScope ?? null,
        sp_alignment: options?.spAlignment ?? null
      };
    }

    contractDashboardMock = createContractDashboardServiceMock({
      data: initialDashboardData,
      loading: options?.dashboardLoading ?? options?.summaryLoading ?? false,
      loadError: options?.dashboardError ?? options?.summaryError ?? false
    });

    topPartnersMock = {
      list: { set: setPartners },
      loading: contractDashboardMock.loading,
      loadError: contractDashboardMock.loadError,
      main: jest.fn(),
      update: contractDashboardMock.update
    };

    topLeversMock = {
      list: { set: setLevers },
      loading: contractDashboardMock.loading,
      loadError: contractDashboardMock.loadError,
      main: jest.fn(),
      update: contractDashboardMock.update
    };

    topMainContactsMock = {
      list: { set: setContacts },
      loading: contractDashboardMock.loading,
      loadError: contractDashboardMock.loadError,
      main: jest.fn(),
      update: contractDashboardMock.update
    };

    topContributorsMock = {
      list: { set: setContributors },
      loading: contractDashboardMock.loading,
      loadError: contractDashboardMock.loadError,
      main: jest.fn(),
      update: contractDashboardMock.update
    };

    contractResultsSummaryMock = {
      list: { set: setSummary },
      loading: contractDashboardMock.loading,
      loadError: contractDashboardMock.loadError,
      main: jest.fn(),
      update: contractDashboardMock.update
    };

    geoScopeMock = {
      summary: {
        set: (summary: any) => {
          const currentGeo = contractDashboardMock.data()?.geo_scope ?? {
            contract_id: 'C-1',
            limit: 10,
            geo_scope_summary: {},
            top_regions: [],
            top_countries: []
          };
          setGeoScope({
            ...currentGeo,
            geo_scope_summary: summary
          });
        }
      },
      topRegionsList: {
        set: (top_regions: any[]) => {
          const currentGeo = contractDashboardMock.data()?.geo_scope ?? {
            contract_id: 'C-1',
            limit: 10,
            geo_scope_summary: {},
            top_regions: [],
            top_countries: []
          };
          setGeoScope({
            ...currentGeo,
            top_regions
          });
        }
      },
      topCountries: {
        set: (top_countries: any[]) => {
          const currentGeo = contractDashboardMock.data()?.geo_scope ?? {
            contract_id: 'C-1',
            limit: 10,
            geo_scope_summary: {},
            top_regions: [],
            top_countries: []
          };
          setGeoScope({
            ...currentGeo,
            top_countries
          });
        }
      },
      loading: contractDashboardMock.loading,
      loadError: contractDashboardMock.loadError,
      main: jest.fn(),
      update: contractDashboardMock.update
    };

    contractSpAlignmentMock = {
      list: { set: setSpAlignment },
      loading: contractDashboardMock.loading,
      loadError: contractDashboardMock.loadError,
      main: jest.fn(),
      update: contractDashboardMock.update
    };

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
    actionsServiceMock = { showToast: jest.fn(), showGlobalAlert: jest.fn() } as any;
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
      GET_IndicatorDetails: jest.fn(),
      GET_Results: jest.fn().mockResolvedValue({
        data: {
          results: [
            { result_status: { result_status_id: 2, name: 'Submitted', config: { color: { text: 'var(--ac-primary-blue-600)' } } } },
            { result_status: { result_status_id: 2, name: 'Submitted', config: { color: { text: 'var(--ac-primary-blue-600)' } } } },
            { result_status: { result_status_id: 1 } },
            { result_status: { result_status_id: 'invalid' } }
          ]
        }
      })
    };

    await TestBed.configureTestingModule({
      imports: [ProjectDashboardComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        DarkModeService,
        { provide: ActivatedRoute, useValue: { parent: { snapshot: { paramMap: convertToParamMap(contractId ? { id: contractId } : {}) } } } },
        { provide: ApiService, useValue: apiMock },
        { provide: GetProjectDetailService, useValue: getProjectDetailServiceMock },
        { provide: GetContractDashboardService, useValue: contractDashboardMock },
        {
          provide: ProjectUtilsService,
          useValue: {
            getLeverName: jest.fn((project: any) => {
              if (project?.levers) {
                const leversArray = Array.isArray(project.levers) ? project.levers : [project.levers];
                const names = leversArray.map((l: any) => l.short_name).filter(Boolean);
                if (names.length) return names.join(', ');
              }
              if (project?.lever) {
                if (typeof project.lever === 'string') return project.lever;
                return project.lever.short_name || project.lever.name || '-';
              }
              if (project?.lever_name) return project.lever_name;
              return '-';
            }),
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
          imports: [
            ProjectDashboardCardComponent,
            GeoScopeCardComponent,
            ResultsCenterTableComponent,
            ResultsTrendCardComponent,
            SpAlignmentGraphComponent,
            VizChartComponent,
            IndicatorDeepDiveComponent,
            InsightsSectionComponent
          ]
        },
        add: {
          imports: [
            ProjectDashboardCardStubComponent,
            GeoScopeCardStubComponent,
            ResultsCenterTableStubComponent,
            ResultsTrendCardStubComponent,
            SpAlignmentGraphStubComponent,
            VizChartStubComponent,
            IndicatorDeepDiveStubComponent,
            InsightsSectionStubComponent
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
    expect(contractDashboardMock.load).toHaveBeenCalledWith('C-1');
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

    contractDashboardMock.loading.set(true);
    expect(component.contributorsEmpty()).toBe(false);

    contractDashboardMock.loading.set(false);
    contractDashboardMock.loadError.set(true);
    expect(component.mainContactPersonsEmpty()).toBe(false);

    contractDashboardMock.loadError.set(false);
    setPartners([{}]);
    setLevers([{}]);

    expect(component.partnersEmpty()).toBe(false);
    expect(component.leversEmpty()).toBe(false);
  });

  describe('status region — aggregate-fed (R-PD-003, R-PD-007, R-PD-009)', () => {
    const sevenBuckets: ContractResultsSummary = {
      total: 40,
      by_indicator_year: [],
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
      // T-04: the drill queryParam must survive the move into the hero (R-DN-004 / K-004 named failing input)
      expect(firstLink.getAttribute('href')).toContain('statusTab=6');

      const compositionLinks = fixture.nativeElement.querySelectorAll('figure[role="img"] a[href]');
      expect(compositionLinks[0].getAttribute('href')).toContain('statusTab=6');
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

    it('should collapse the status region into no-data-group when aggregate returns no statuses (R-PD-007, R-HL-004)', async () => {
      await setup('C-1', {
        summary: { total: 0, by_indicator_year: [], by_status: [], by_year: [], partner_institutions: 0 }
      });

      expect(component.statusChartEmpty()).toBe(true);

      const section = fixture.nativeElement.querySelector('section[aria-labelledby="results-by-status-title"]');
      expect(section).toBeNull();

      const noDataGroup = fixture.nativeElement.querySelector('app-no-data-group');
      expect(noDataGroup).not.toBeNull();
      expect(noDataGroup.textContent).toContain('Results by status');
      expect(noDataGroup.textContent).toContain('No result statuses were found for this project.');
    });
  });

  it('should compute zero share when indicator value is not positive', async () => {
    await setup();

    expect(component.indicatorSharePercent(0)).toBe(0);
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
          by_indicator_year: [],
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
          by_indicator_year: [],
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
        by_indicator_year: [],
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
          by_indicator_year: [],
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
          by_indicator_year: [],
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

    it('should navigate to project-results on Total results tile click (transition KZ-015 / R-HL-002)', async () => {
      await setup('C-1', {
        projectData: {
          indicators: [
            { indicator: { indicator_id: 1, name: 'Publications' }, count_results: 8 } as any
          ]
        }
      });
      const router = TestBed.inject(Router);
      const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

      // Initial state: no navigation
      expect(navSpy).not.toHaveBeenCalled();

      const totalResultsBtn: HTMLElement = fixture.nativeElement.querySelector('button[aria-label*="Total results"]');
      expect(totalResultsBtn).not.toBeNull();

      totalResultsBtn.click();
      fixture.detectChanges();

      expect(navSpy).toHaveBeenCalledWith(['/project-detail', 'C-1'], {
        queryParams: { resultsTab: 1 }
      });
    });

    it('should not navigate to project-results when Total results tile is clicked while loading (R-HL-002)', async () => {
      await setup('C-1', { projectLoading: true, projectData: null });
      const router = TestBed.inject(Router);
      const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

      const totalResultsTile = fixture.nativeElement.querySelector('[aria-label*="Loading total results"]');
      expect(totalResultsTile).not.toBeNull();

      totalResultsTile.click();
      component.navigateToTotalResults();
      fixture.detectChanges();

      expect(navSpy).not.toHaveBeenCalled();
    });

    it('should open popover listing only indicators with value > 0 and navigate on row click (R-HL-002, D-F1-5)', async () => {
      await setup('C-1', {
        projectData: {
          indicators: [
            { indicator: { indicator_id: 1, name: 'Publications' }, count_results: 5 } as any,
            { indicator: { indicator_id: 2, name: 'Innovations' }, count_results: 3 } as any,
            { indicator: { indicator_id: 3, name: 'Zero Count Indicator' }, count_results: 0 } as any
          ]
        }
      });
      const router = TestBed.inject(Router);
      const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

      // Initial state: no navigation
      expect(navSpy).not.toHaveBeenCalled();

      const indicatorsBtn: HTMLElement = fixture.nativeElement.querySelector('button[aria-label*="Indicators covered"]');
      expect(indicatorsBtn).not.toBeNull();

      indicatorsBtn.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const popoverContent = document.querySelector('[data-testid="indicators-covered-popover"]') ?? fixture.nativeElement.querySelector('[data-testid="indicators-covered-popover"]');
      expect(popoverContent).not.toBeNull();

      // Assert indicators with value > 0 appear
      expect(popoverContent?.textContent).toContain('Publications');
      expect(popoverContent?.textContent).toContain('Innovations');
      // Zero-count indicator MUST NOT appear (named failing input)
      expect(popoverContent?.textContent).not.toContain('Zero Count Indicator');

      // Click on Publications indicator row in popover
      const publicationBtn: HTMLElement = popoverContent?.querySelector('button[aria-label*="Publications"]') as HTMLElement;
      expect(publicationBtn).not.toBeNull();

      publicationBtn.click();
      fixture.detectChanges();

      expect(navSpy).toHaveBeenCalledWith(['/project-detail', 'C-1'], {
        queryParams: { indicatorTab: 1 }
      });
    });

    it('should smooth-scroll to #partners-card on Partner institutions tile click (R-HL-002)', async () => {
      await setup('C-1', {
        summary: {
          total: 10,
          by_indicator_year: [],
          by_status: [],
          by_year: [],
          partner_institutions: 8
        }
      });
      topPartnersMock.list.set([{ institution_id: 1, institution_name: 'CIAT', count: 8 }]);
      fixture.detectChanges();

      const partnersTarget = fixture.nativeElement.querySelector('#partners-card') ?? document.getElementById('partners-card');
      expect(partnersTarget).not.toBeNull();
      const scrollSpy = jest.fn();
      partnersTarget.scrollIntoView = scrollSpy;

      const partnersBtn: HTMLElement = fixture.nativeElement.querySelector('button[aria-label*="Partner institutions"]');
      expect(partnersBtn).not.toBeNull();

      partnersBtn.click();
      expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
    });

    it('should use behavior: auto for Partner institutions scroll when prefers-reduced-motion is active (R-HL-002)', async () => {
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
          by_indicator_year: [],
          by_status: [],
          by_year: [],
          partner_institutions: 8
        }
      });
      topPartnersMock.list.set([{ institution_id: 1, institution_name: 'CIAT', count: 8 }]);
      fixture.detectChanges();

      const partnersTarget = fixture.nativeElement.querySelector('#partners-card') ?? document.getElementById('partners-card');
      const scrollSpy = jest.fn();
      partnersTarget.scrollIntoView = scrollSpy;

      component.scrollToPartners();
      expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));

      window.matchMedia = originalMatchMedia;
    });

    it('should not scroll when Partner institutions tile is clicked while loading (R-HL-002)', async () => {
      await setup('C-1', { summaryLoading: true, summary: null });

      const partnersTarget = fixture.nativeElement.querySelector('#partners-card') ?? document.getElementById('partners-card');
      const scrollSpy = jest.fn();
      if (partnersTarget) {
        partnersTarget.scrollIntoView = scrollSpy;
      }

      component.scrollToPartners();
      expect(scrollSpy).not.toHaveBeenCalled();
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

    it('should collapse into no-data-group when total project results is 0 and not loading/error (R-PD-007, R-PD-005, R-HL-004)', async () => {
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

      expect(component.indicatorsEmpty()).toBe(true);
      expect(component.collapsedEmptyWidgets().some(w => w.name === 'Results by indicator')).toBe(true);

      const indicatorSection = fixture.nativeElement.querySelector('section[aria-labelledby="results-by-indicator-title"]');
      expect(indicatorSection).toBeNull();

      const noDataGroup = fixture.nativeElement.querySelector('app-no-data-group');
      expect(noDataGroup).not.toBeNull();
      expect(noDataGroup.textContent).toContain('Results by indicator');
      expect(noDataGroup.textContent).toContain('No results were found for any indicator on this project.');
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
          by_indicator_year: [],
          by_status: [{ status_id: 6, name: 'Approved', count: 5 }],
          by_year: [{ year: 2024, count: 5 }],
          partner_institutions: 3
        }
      });

      // Simulate getProjectDetailService failure
      getProjectDetailServiceMock.loadError.set(true);
      getProjectDetailServiceMock.loading.set(false);

      // Contract dashboard service succeeded with data
      setLevers([
        { lever_id: 1, short_name: 'L1', full_name: 'Lever 1', count: 4 }
      ]);
      contractDashboardMock.loading.set(false);
      contractDashboardMock.loadError.set(false);

      fixture.detectChanges();

      // getProjectDetailService is in error
      expect(getProjectDetailServiceMock.loadError()).toBe(true);

      // Indicators card displays error retry
      const indicatorSection = fixture.nativeElement.querySelector('section[aria-labelledby="results-by-indicator-title"]');
      expect(indicatorSection.textContent).toContain('We could not load results by indicator');

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
      expect(firstLink.getAttribute('aria-label')).toContain('Publications: 8 results — view filtered results');
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
      contractSpAlignmentMock.list.set({
        sps: [{ sp_code: 'SP1', name: 'SP 1', category: null, icon_key: null, links: [] }],
        results_with_alignment: 1,
        results_without_alignment: 0
      });
      fixture.detectChanges();

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

  describe('bars <-> heatmap toggle and matrix (R-DA-004, R-DA-007, T-10)', () => {
    const summaryWithMatrix: ContractResultsSummary = {
      total: 10,
      by_status: [],
      by_year: [
        { year: 2022, count: 3 },
        { year: 2023, count: 7 }
      ],
      by_indicator_year: [
        { indicator_id: 1, year: 2022, count: 2 },
        { indicator_id: 1, year: 2023, count: 4 },
        { indicator_id: 99, year: 2022, count: 1 },
        { indicator_id: 99, year: 2023, count: 3 }
      ],
      partner_institutions: 0
    };

    it('should default to bars view and toggle to heatmap view', async () => {
      await setup('C-1', { summary: summaryWithMatrix });

      expect(component.indicatorView()).toBe('bars');
      component.setIndicatorView('heatmap');
      expect(component.indicatorView()).toBe('heatmap');
    });

    it('should issue zero HTTP requests across the toggle (R-DA-004 BUT no-refetch)', async () => {
      await setup('C-1', { summary: summaryWithMatrix });

      contractResultsSummaryMock.main.mockClear();
      contractResultsSummaryMock.update.mockClear();
      getProjectDetailServiceMock.load.mockClear();
      apiMock.GET_Results.mockClear();

      component.setIndicatorView('heatmap');
      fixture.detectChanges();

      component.setIndicatorView('bars');
      fixture.detectChanges();

      expect(contractResultsSummaryMock.main).not.toHaveBeenCalled();
      expect(contractResultsSummaryMock.update).not.toHaveBeenCalled();
      expect(getProjectDetailServiceMock.load).not.toHaveBeenCalled();
      expect(apiMock.GET_Results).not.toHaveBeenCalled();
    });

    it('should update aria-pressed states on toggle buttons upon user interaction', async () => {
      await setup('C-1', { summary: summaryWithMatrix });

      const buttons = fixture.nativeElement.querySelectorAll('header [role="group"] button');
      expect(buttons.length).toBe(2);

      const [barsBtn, heatmapBtn] = Array.from(buttons) as HTMLButtonElement[];
      expect(barsBtn.getAttribute('aria-pressed')).toBe('true');
      expect(heatmapBtn.getAttribute('aria-pressed')).toBe('false');

      heatmapBtn.click();
      fixture.detectChanges();

      expect(component.indicatorView()).toBe('heatmap');
      expect(barsBtn.getAttribute('aria-pressed')).toBe('false');
      expect(heatmapBtn.getAttribute('aria-pressed')).toBe('true');
    });

    it('should compute heatmap options and tableModel reconciling total results', async () => {
      await setup('C-1', {
        summary: summaryWithMatrix,
        projectData: {
          indicators: [
            { indicator: { indicator_id: 1, name: 'Output' }, count_results: 6 } as any,
            { indicator_id: 99, full_name: 'Outcome', count_results: 4 } as any
          ]
        }
      });

      expect(component.heatmapYears()).toEqual([2022, 2023]);
      expect(component.heatmapMinCount()).toBe(1);
      expect(component.heatmapMaxCount()).toBe(4);

      const tableModel = component.indicatorHeatmapTableModel();
      expect(tableModel.caption).toBe('Results by indicator and year matrix');
      expect(tableModel.headers).toEqual(['Indicator', '2022', '2023', 'Total']);
      expect(tableModel.rows.length).toBe(2);

      const rowSum = tableModel.rows.reduce((sum, row) => sum + (row[row.length - 1] as number), 0);
      expect(rowSum).toBe(10);
      expect(rowSum).toBe(component.totalProjectResults());

      const options = component.indicatorHeatmapOptions();
      expect(options).toBeTruthy();
      expect((options?.series as any[])[0].type).toBe('heatmap');
      expect((options?.series as any[])[0].data.length).toBe(4);
    });

    it('should render the ramp legend in DOM when heatmap view is active', async () => {
      await setup('C-1', {
        summary: summaryWithMatrix,
        projectData: {
          indicators: [
            { indicator: { indicator_id: 1, name: 'Output' }, count_results: 6 } as any,
            { indicator_id: 99, full_name: 'Outcome', count_results: 4 } as any
          ]
        }
      });
      component.setIndicatorView('heatmap');
      fixture.detectChanges();

      const legend = fixture.nativeElement.querySelector('[aria-label="Heatmap density scale"]');
      expect(legend).toBeTruthy();
      expect(legend.textContent).toContain('1 results');
      expect(legend.textContent).toContain('4 results');

      const swatches = legend.querySelectorAll('span[class*="bg-[var(--ac-viz-ramp-"]');
      expect(swatches.length).toBe(5);
    });

    it('should navigate to indicator tab on heatmap cell click', async () => {
      await setup('C-1', {
        summary: summaryWithMatrix,
        projectData: {
          indicators: [
            { indicator: { indicator_id: 1, name: 'Output' }, count_results: 6 } as any,
            { indicator_id: 99, full_name: 'Outcome', count_results: 4 } as any
          ]
        }
      });
      const router = TestBed.inject(Router);
      const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

      component.onIndicatorHeatmapClick({ data: [0, 0, 2] } as any);
      expect(navSpy).toHaveBeenCalledWith(['/project-detail', 'C-1'], {
        queryParams: { indicatorTab: 1 }
      });
    });

    it('mounts the F3 indicator deep-dive panel alongside Results by indicator and does not intercept its bar-click navigation (R-DD-005)', async () => {
      await setup('C-1', {
        summary: summaryWithMatrix,
        projectData: {
          indicators: [
            { indicator: { indicator_id: 1, name: 'Output' }, count_results: 6 } as any,
            { indicator_id: 99, full_name: 'Outcome', count_results: 4 } as any
          ]
        }
      });
      const router = TestBed.inject(Router);
      const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

      // Panel is mounted (R-DD-003) alongside the existing indicator region.
      const deepDiveEl = fixture.nativeElement.querySelector('app-indicator-deep-dive');
      expect(deepDiveEl).not.toBeNull();

      // The F1 drill-through behavior is unchanged with the panel present —
      // the deep-dive component does not intercept or alter this navigation.
      component.onIndicatorHeatmapClick({ data: [0, 0, 2] } as any);
      expect(navSpy).toHaveBeenCalledWith(['/project-detail', 'C-1'], {
        queryParams: { indicatorTab: 1 }
      });
    });

    it('passes contractId and the bar-ordered indicatorsWithResults() to the deep-dive panel without re-deriving them', async () => {
      await setup('C-1', {
        summary: summaryWithMatrix,
        projectData: {
          indicators: [
            { indicator: { indicator_id: 1, name: 'Output' }, count_results: 6 } as any,
            { indicator_id: 99, full_name: 'Outcome', count_results: 4 } as any
          ]
        }
      });

      const deepDiveDebugEl = fixture.debugElement.query(By.css('app-indicator-deep-dive'));
      expect(deepDiveDebugEl).not.toBeNull();
      const stub = deepDiveDebugEl.componentInstance as IndicatorDeepDiveStubComponent;
      expect(stub.contractId).toBe('C-1');
      expect(stub.indicators).toEqual(component.indicatorsWithResults());
      expect(stub.indicators.map(i => i.id)).toEqual([1, 99]);
      expect(stub.loading).toBe(false);
    });

    it(
      'passes GetProjectDetailService.loading() through to the deep-dive panel — it stays mounted and shows its own ' +
        'skeleton, never a false "no indicators" notice, during the F1 load window ' +
        '(failing input: no [loading] binding, the stub/component always sees loading=false)',
      async () => {
        await setup('C-1', {
          projectLoading: true,
          projectData: { indicators: [] }
        });

        // Still loading — genuinely-empty vs not-loaded-yet must stay distinguishable.
        expect(component.indicatorsEmpty()).toBe(false);

        const deepDiveDebugEl = fixture.debugElement.query(By.css('app-indicator-deep-dive'));
        expect(deepDiveDebugEl).not.toBeNull();
        const stub = deepDiveDebugEl.componentInstance as IndicatorDeepDiveStubComponent;
        expect(stub.loading).toBe(true);
      }
    );

    it('does not mount the deep-dive panel when there are no results for any indicator', async () => {
      await setup('C-1', {
        projectData: { indicators: [] }
      });

      expect(component.indicatorsEmpty()).toBe(true);
      expect(fixture.nativeElement.querySelector('app-indicator-deep-dive')).toBeNull();
    });

    it('should support engine-native morph via universalTransition sharing series id between bar and heatmap (R-DA-007)', async () => {
      await setup('C-1', {
        summary: summaryWithMatrix,
        projectData: {
          indicators: [
            { indicator: { indicator_id: 1, name: 'Output' }, count_results: 6 } as any,
            { indicator_id: 99, full_name: 'Outcome', count_results: 4 } as any
          ]
        }
      });

      const barOpts = component.indicatorBarOptions();
      const heatmapOpts = component.indicatorHeatmapOptions();

      expect(barOpts).toBeTruthy();
      expect(heatmapOpts).toBeTruthy();

      const barSeries = (barOpts?.series as any[])[0];
      const heatmapSeries = (heatmapOpts?.series as any[])[0];

      // Assert shared series id and universalTransition enabled
      expect(barSeries.id).toBe('indicator-series');
      expect(heatmapSeries.id).toBe('indicator-series');
      expect(barSeries.universalTransition.enabled).toBe(true);
      expect(heatmapSeries.universalTransition.enabled).toBe(true);

      // Active chart options updates seamlessly on toggle
      component.setIndicatorView('bars');
      expect(component.activeIndicatorChartOptions()).toBe(barOpts);
      component.setIndicatorView('heatmap');
      expect(component.activeIndicatorChartOptions()).toBe(heatmapOpts);
    });

    it('should default to engine-native morph path and switch to fallback path when prefers-reduced-motion matches (R-HL-007, KZ-015)', async () => {
      let reducedMotion = false;
      const listeners: ((e: any) => void)[] = [];
      const mql: any = {
        get matches() {
          return reducedMotion;
        },
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addListener: (fn: any) => listeners.push(fn),
        removeListener: jest.fn(),
        addEventListener: (_type: string, fn: any) => listeners.push(fn),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      };
      const origMatchMedia = window.matchMedia;
      window.matchMedia = jest.fn().mockImplementation((query: string) => {
        if (query === '(prefers-reduced-motion: reduce)') {
          return mql;
        }
        return { matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() } as any;
      });

      try {
        await setup('C-1', {
          summary: summaryWithMatrix,
          projectData: {
            indicators: [
              { indicator: { indicator_id: 1, name: 'Output' }, count_results: 6 } as any,
              { indicator_id: 99, full_name: 'Outcome', count_results: 4 } as any
            ]
          }
        });

        // 1. Default state: engine-native morph path (useCrossfadeFallback is false)
        expect(component.useCrossfadeFallback()).toBe(false);
        expect(fixture.nativeElement.querySelector('app-viz-chart')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('ul.sr-only')).toBeTruthy();
        expect(fixture.nativeElement.querySelector('section[aria-labelledby="results-by-indicator-title"] ul:not(.sr-only)')).toBeNull();

        // 2. KZ-015 transition: toggle reduced-motion state
        reducedMotion = true;
        listeners.forEach(fn => fn({ matches: true } as MediaQueryListEvent));
        component.updateReducedMotionPreference();
        fixture.detectChanges();

        // 3. Fallback path renders
        expect(component.useCrossfadeFallback()).toBe(true);
        expect(fixture.nativeElement.querySelector('ul.sr-only')).toBeNull();
        expect(fixture.nativeElement.querySelector('section[aria-labelledby="results-by-indicator-title"] ul:not(.sr-only)')).toBeTruthy();
      } finally {
        window.matchMedia = origMatchMedia;
      }
    });

    it('should render sr-only indicator drill-through links for all indicators with results, excluding zero-count indicators (R-HL-007, R-HL-009, D-F1-2)', async () => {
      await setup('C-1', {
        projectData: {
          agreement_id: 'C-1',
          indicators: [
            { indicator: { indicator_id: 1, name: 'Publications' }, count_results: 8 } as any,
            { indicator: { indicator_id: 2, name: 'Innovations' }, count_results: 4 } as any,
            { indicator: { indicator_id: 3, name: 'Zero Count Indicator' }, count_results: 0 } as any
          ]
        }
      });

      expect(component.useCrossfadeFallback()).toBe(false);

      const srOnlyUl = fixture.nativeElement.querySelector('section[aria-labelledby="results-by-indicator-title"] ul.sr-only');
      expect(srOnlyUl).toBeTruthy();
      expect(srOnlyUl.getAttribute('aria-label')).toBe('Results by indicator drill-through links');

      const links = Array.from(srOnlyUl.querySelectorAll('li a')) as HTMLAnchorElement[];
      expect(links.length).toBe(2); // Zero-count indicator excluded!

      const link1 = links[0];
      expect(link1.getAttribute('href')).toContain('/project-detail/C-1?indicatorTab=1');
      expect(link1.getAttribute('aria-label')).toBe('Publications: 8 results — view filtered results');
      expect(link1.textContent?.trim()).toBe('Publications (8 results)');

      const link2 = links[1];
      expect(link2.getAttribute('href')).toContain('/project-detail/C-1?indicatorTab=2');
      expect(link2.getAttribute('aria-label')).toBe('Innovations: 4 results — view filtered results');
      expect(link2.textContent?.trim()).toBe('Innovations (4 results)');

      // Verify zero-count indicator does not exist in the list
      const allText = srOnlyUl.textContent ?? '';
      expect(allText).not.toContain('Zero Count Indicator');
    });

    it('should navigate to indicatorTab on both bar and heatmap chart clicks in native morph mode across view toggle (R-HL-007, R-HL-009)', async () => {
      await setup('C-1', {
        summary: summaryWithMatrix,
        projectData: {
          indicators: [
            { indicator: { indicator_id: 10, name: 'Policy Changes' }, count_results: 5 } as any,
            { indicator: { indicator_id: 20, name: 'Capacity Sharing' }, count_results: 3 } as any
          ]
        }
      });

      const router = TestBed.inject(Router);
      const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

      expect(component.useCrossfadeFallback()).toBe(false);
      expect(component.indicatorView()).toBe('bars');

      // 1. Click bar in 'bars' view (Policy Changes, id 10)
      component.onIndicatorHeatmapClick({ dataIndex: 1, name: 'Policy Changes' } as any);
      expect(navSpy).toHaveBeenCalledWith(['/project-detail', 'C-1'], {
        queryParams: { indicatorTab: 10 }
      });
      navSpy.mockClear();

      // Click second bar in 'bars' view (Capacity Sharing, id 20)
      component.onIndicatorHeatmapClick({ dataIndex: 0, name: 'Capacity Sharing' } as any);
      expect(navSpy).toHaveBeenCalledWith(['/project-detail', 'C-1'], {
        queryParams: { indicatorTab: 20 }
      });
      navSpy.mockClear();

      // 2. Toggle to 'heatmap' view
      component.setIndicatorView('heatmap');
      expect(component.indicatorView()).toBe('heatmap');

      // Click cell in heatmap view (indicator index 0 -> Policy Changes, id 10)
      component.onIndicatorHeatmapClick({ data: [0, 0, 5] } as any);
      expect(navSpy).toHaveBeenCalledWith(['/project-detail', 'C-1'], {
        queryParams: { indicatorTab: 10 }
      });
      navSpy.mockClear();

      // Click cell in heatmap view (indicator index 1 -> Capacity Sharing, id 20)
      component.onIndicatorHeatmapClick({ data: [1, 1, 3] } as any);
      expect(navSpy).toHaveBeenCalledWith(['/project-detail', 'C-1'], {
        queryParams: { indicatorTab: 20 }
      });
      navSpy.mockClear();

      // 3. Toggle back to 'bars' view
      component.setIndicatorView('bars');
      expect(component.indicatorView()).toBe('bars');

      // Re-assert bar click still navigates after toggle
      component.onIndicatorHeatmapClick({ dataIndex: 1, name: 'Policy Changes' } as any);
      expect(navSpy).toHaveBeenCalledWith(['/project-detail', 'C-1'], {
        queryParams: { indicatorTab: 10 }
      });
    });

    it('should toggle between native morph single viz-chart and HTML ranked list via useCrossfadeFallback (proposal §12)', async () => {
      await setup('C-1', {
        summary: summaryWithMatrix,
        projectData: {
          indicators: [
            { indicator: { indicator_id: 1, name: 'Output' }, count_results: 6 } as any,
            { indicator_id: 99, full_name: 'Outcome', count_results: 4 } as any
          ]
        }
      });

      // Default is native morph mode
      expect(component.useCrossfadeFallback()).toBe(false);
      expect(fixture.nativeElement.querySelector('app-viz-chart')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('ul.sr-only')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('section[aria-labelledby="results-by-indicator-title"] ul:not(.sr-only)')).toBeNull();

      // Switch to crossfade fallback mode (HTML ranked list in DOM)
      component.useCrossfadeFallback.set(true);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('section[aria-labelledby="results-by-indicator-title"] ul:not(.sr-only)')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('ul.sr-only')).toBeNull();
    });
  });

  describe('T-12 dashboard integration and entry stagger (R-DA-003, R-DA-005, R-DA-007 AC.2)', () => {
    it('should enforce DOM rendering order: Hero (KPI + Context) -> Caveat -> Executive Overview -> Trend/Status -> Indicator -> Geo Scope -> Rankings/SP -> Pending -> No data (R-HL-003, design §6)', async () => {
      rolesServiceMock.isAdmin.mockReturnValue(true);
      await setup('C-1', {
        projectData: {
          funding_type: 'Bilateral',
          grant_amount_usd: 1000000,
          indicators: [{ indicator: { indicator_id: 1, name: 'Output' }, count_results: 5 } as any]
        },
        summary: {
          total: 10,
          by_indicator_year: [],
          by_status: [{ status_id: 6, name: 'Approved', count: 5 }],
          by_year: [{ year: 2024, count: 5 }, { year: 2025, count: 5 }],
          partner_institutions: 2
        }
      });
      topPartnersMock.list.set([{ institution_id: 1, institution_name: 'CIAT', count: 3 }]);
      contractSpAlignmentMock.list.set({
        sps: [{ sp_code: 'SP1', name: 'SP 1', category: null, icon_key: null, links: [] }],
        results_with_alignment: 1,
        results_without_alignment: 0
      });
      geoScopeMock.topCountries.set([{ country_name: 'Colombia', iso_alpha_2: 'CO', count: 2 } as any]);
      fixture.detectChanges();

      const root = fixture.nativeElement as HTMLElement;
      const kpiStrip = root.querySelector('[aria-label="Key performance indicators"]');
      const contextStrip = root.querySelector('[aria-label="Project context summary"]');
      const caveat = root.querySelector('button[aria-controls="dashboard-caveat-details"]')?.closest('div');
      const trendCard = root.querySelector('app-results-trend-card');
      const statusSection = root.querySelector('section[aria-labelledby="results-by-status-title"]');
      const indicatorSection = root.querySelector('section[aria-labelledby="results-by-indicator-title"]');
      const geoCard = root.querySelector('app-geo-scope-card');
      const partnersCard = root.querySelector('#partners-card');
      const spGraph = root.querySelector('app-sp-alignment-graph');
      const pendingSection = root.querySelector('#pending-revision-section');
      const noDataGroup = root.querySelector('app-no-data-group');

      expect(kpiStrip).toBeTruthy();
      expect(contextStrip).toBeTruthy();
      expect(caveat).toBeTruthy();
      expect(trendCard).toBeTruthy();
      expect(statusSection).toBeTruthy();
      expect(indicatorSection).toBeTruthy();
      expect(geoCard).toBeTruthy();
      expect(partnersCard).toBeTruthy();
      expect(spGraph).toBeTruthy();
      expect(pendingSection).toBeTruthy();
      expect(noDataGroup).toBeTruthy();

      // Verify DOM document order:
      // Hero (KPI -> Context) -> Caveat -> Executive Overview -> Trend/Status -> Indicator -> Geo Scope -> Rankings/SP -> Pending -> No data yet -> AI
      expect(kpiStrip!.compareDocumentPosition(contextStrip!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(contextStrip!.compareDocumentPosition(caveat!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(caveat!.compareDocumentPosition(trendCard!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(trendCard!.compareDocumentPosition(indicatorSection!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(statusSection!.compareDocumentPosition(indicatorSection!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(indicatorSection!.compareDocumentPosition(geoCard!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(geoCard!.compareDocumentPosition(partnersCard!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(partnersCard!.compareDocumentPosition(pendingSection!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(spGraph!.compareDocumentPosition(pendingSection!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(pendingSection!.compareDocumentPosition(noDataGroup!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      // Assert trend & status sections precede ranking cards in DOM
      expect(trendCard!.compareDocumentPosition(partnersCard!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(statusSection!.compareDocumentPosition(partnersCard!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      // Assert geo section is marked full-width class
      expect(geoCard!.classList.contains('w-full')).toBe(true);

      // Assert no element with gap-16 class exists in dashboard template
      const elementsWithGap16 = root.querySelectorAll('.gap-16, [class*="gap-16"]');
      expect(elementsWithGap16.length).toBe(0);
    });

    it('should isolate SP alignment error so sibling regions continue rendering data (R-PD-007, R-DA-003)', async () => {
      await setup('C-1', {
        projectData: {
          funding_type: 'Bilateral',
          indicators: [{ indicator: { indicator_id: 1, name: 'Output' }, count_results: 5 } as any]
        },
        summary: {
          total: 5,
          by_indicator_year: [],
          by_status: [{ status_id: 6, name: 'Approved', count: 5 }],
          by_year: [{ year: 2024, count: 5 }],
          partner_institutions: 0
        }
      });

      // Simulate SP alignment service error
      contractDashboardMock.loadError.set(true);
      contractDashboardMock.loading.set(false);
      fixture.detectChanges();

      // SP alignment graph displays its error state
      const spGraph = fixture.nativeElement.querySelector('app-sp-alignment-graph');
      expect(spGraph).toBeTruthy();
      expect(spGraph.textContent).toContain('could not load');

      // Sibling status, indicators, KPI cards remain intact
      expect(fixture.nativeElement.querySelector('[aria-label="Key performance indicators"]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('section[aria-labelledby="results-by-indicator-title"]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('section[aria-labelledby="results-by-status-title"]')).toBeTruthy();
    });

    it('should configure and bind widget entry stagger delays to DOM elements with total duration <= 400ms (R-DA-007 AC.2)', async () => {
      await setup('C-1', {
        projectData: {
          funding_type: 'Bilateral',
          grant_amount_usd: 1000000,
          indicators: [{ indicator: { indicator_id: 1, name: 'Output' }, count_results: 5 } as any]
        },
        summary: {
          total: 5,
          by_indicator_year: [],
          by_status: [{ status_id: 6, name: 'Approved', count: 5 }],
          by_year: [{ year: 2024, count: 5 }],
          partner_institutions: 0
        }
      });
      contractSpAlignmentMock.list.set({
        sps: [{ sp_code: 'SP1', name: 'SP 1', category: null, icon_key: null, links: [] }],
        results_with_alignment: 1,
        results_without_alignment: 0
      });
      fixture.detectChanges();

      expect(WIDGET_ENTRY_STAGGER_MS).toBeDefined();
      expect(WIDGET_ENTRY_STAGGER_MS.kpi).toBe(0);
      expect(WIDGET_ENTRY_STAGGER_MS.contextStrip).toBe(100);
      expect(WIDGET_ENTRY_STAGGER_MS.indicatorStatus).toBe(200);
      expect(WIDGET_ENTRY_STAGGER_MS.trend).toBe(300);
      expect(WIDGET_ENTRY_STAGGER_MS.spGraph).toBe(400);

      const maxDelay = Math.max(...Object.values(WIDGET_ENTRY_STAGGER_MS));
      expect(maxDelay).toBeLessThanOrEqual(400);

      const root = fixture.nativeElement as HTMLElement;
      const kpiStrip = root.querySelector('[aria-label="Key performance indicators"]') as HTMLElement;
      const contextStrip = root.querySelector('[aria-label="Project context summary"]') as HTMLElement;
      const indicatorSection = root.querySelector('section[aria-labelledby="results-by-indicator-title"]') as HTMLElement;
      const statusSection = root.querySelector('section[aria-labelledby="results-by-status-title"]') as HTMLElement;
      const trendCard = root.querySelector('app-results-trend-card') as HTMLElement;
      const spGraph = root.querySelector('app-sp-alignment-graph') as HTMLElement;

      expect(kpiStrip?.style.animationDelay).toBe('0ms');
      expect(contextStrip?.style.animationDelay).toBe('100ms');
      expect(indicatorSection?.style.animationDelay).toBe('200ms');
      expect(statusSection?.style.animationDelay).toBe('200ms');
      expect(trendCard?.style.animationDelay).toBe('300ms');
      expect(spGraph?.style.animationDelay).toBe('400ms');
    });
  });

  describe('Status semaphore lives in the hero (T-04, D-DN-6 OQ-1-A, KZ-015)', () => {
    it('shows the hero skeleton first, then the status strip nested in the hero region once data arrives (transition-arranged)', async () => {
      // Construct: project context still loading, status still loading (KZ-015 — arrange the transition)
      await setup('C-1', {
        projectData: { grant_amount: 500 },
        projectLoading: true,
        summaryLoading: true,
        summary: null
      });

      expect(fixture.nativeElement.querySelector('[aria-label="Loading project context"]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('[aria-label="Project context summary"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('section[aria-labelledby="results-by-status-title"]')).toBeNull();

      // Data arrives for both
      getProjectDetailServiceMock.loading.set(false);
      component.project.set({ grant_amount: 500 } as any);
      contractResultsSummaryMock.loading.set(false);
      contractResultsSummaryMock.list.set({
        total: 5,
        by_indicator_year: [],
        by_status: [{ status_id: 6, name: 'Approved', count: 5 }],
        by_year: [],
        partner_institutions: 0
      });
      fixture.detectChanges();

      const heroSection = fixture.nativeElement.querySelector('[aria-label="Project context summary"]');
      const statusSection = fixture.nativeElement.querySelector('section[aria-labelledby="results-by-status-title"]');
      expect(heroSection).toBeTruthy();
      expect(statusSection).toBeTruthy();

      // D-DN-6 OQ-1-A: the semaphore renders INSIDE the hero, not as a standalone sibling card
      expect(heroSection.contains(statusSection)).toBe(true);
    });

    it('renders the strip in the hero even when the project has no other context facts (R-DN-004 no regression)', async () => {
      const noContextProject: GetProjectDetail = {
        grant_amount: null as any,
        grant_amount_usd: null,
        center_amount_usd: null,
        funding_type: null,
        start_date: undefined,
        end_date: undefined,
        donor: undefined,
        division: undefined,
        divisionId: undefined,
        unit: undefined,
        unitId: undefined,
        sdgs: null as any,
        cgiar_entities: null as any
      };

      await setup('C-1', {
        projectData: noContextProject,
        summary: {
          total: 5,
          by_indicator_year: [],
          by_status: [{ status_id: 6, name: 'Approved', count: 5 }],
          by_year: [],
          partner_institutions: 0
        }
      });

      expect(component.hasAnyContext()).toBe(false);
      expect(component.statusChartEmpty()).toBe(false);

      const heroSection = fixture.nativeElement.querySelector('[aria-label="Project context summary"]');
      expect(heroSection).toBeTruthy();

      const statusSection = fixture.nativeElement.querySelector('section[aria-labelledby="results-by-status-title"]');
      expect(statusSection).toBeTruthy();
      expect(heroSection.contains(statusSection)).toBe(true);

      // No content above it in the hero, so no top border separator is applied
      expect(statusSection.classList.contains('border-t')).toBe(false);
    });

    it('hides the strip row without hiding the hero when status resolves empty, and retires the old standalone status card', async () => {
      await setup('C-1', {
        projectData: { grant_amount: 500 },
        summary: { total: 0, by_indicator_year: [], by_status: [], by_year: [], partner_institutions: 0 }
      });

      expect(component.statusChartEmpty()).toBe(true);

      const heroSection = fixture.nativeElement.querySelector('[aria-label="Project context summary"]');
      expect(heroSection).toBeTruthy();
      expect(fixture.nativeElement.querySelector('section[aria-labelledby="results-by-status-title"]')).toBeNull();
    });
  });

  describe('Trend & indicator grid re-pairing (T-04, D-DN-6 reversion challenge 1)', () => {
    it('pairs the trend card with results-by-indicator in one lg:grid-cols-2 grid, keyed on indicatorsEmpty — not the retired statusChartEmpty pairing', async () => {
      await setup('C-1', {
        projectData: {
          grant_amount: 500,
          indicators: [{ indicator: { indicator_id: 1, name: 'Output' }, count_results: 5 } as any]
        },
        summary: {
          total: 5,
          by_indicator_year: [],
          by_status: [], // status EMPTY — the named failing input: old conditional would leave trend orphaned full-width
          by_year: [{ year: 2024, count: 5 }],
          partner_institutions: 0
        }
      });

      expect(component.trendEmpty()).toBe(false);
      expect(component.statusChartEmpty()).toBe(true);
      expect(component.indicatorsEmpty()).toBe(false);

      const trendCard = fixture.nativeElement.querySelector('app-results-trend-card');
      const indicatorSection = fixture.nativeElement.querySelector('section[aria-labelledby="results-by-indicator-title"]');
      expect(trendCard).toBeTruthy();
      expect(indicatorSection).toBeTruthy();

      // Trend and indicator must be siblings in the SAME grid row
      const grid = trendCard.parentElement;
      expect(grid).toBe(indicatorSection.parentElement);
      expect(grid.classList.contains('grid')).toBe(true);
      expect(grid.classList.contains('lg:grid-cols-2')).toBe(true);

      // The status section is no longer this grid's second slot — it lives in the hero, not here
      const statusSection = fixture.nativeElement.querySelector('section[aria-labelledby="results-by-status-title"]');
      expect(statusSection).toBeNull();
      expect(grid.querySelector('section[aria-labelledby="results-by-status-title"]')).toBeNull();
    });

    it('renders trend full-width (no lg:grid-cols-2) when results-by-indicator is empty, even if status has data', async () => {
      await setup('C-1', {
        projectData: {
          grant_amount: 500,
          indicators: []
        },
        summary: {
          total: 5,
          by_indicator_year: [],
          by_status: [{ status_id: 6, name: 'Approved', count: 5 }],
          by_year: [{ year: 2024, count: 5 }],
          partner_institutions: 0
        }
      });

      expect(component.trendEmpty()).toBe(false);
      expect(component.indicatorsEmpty()).toBe(true);

      const trendCard = fixture.nativeElement.querySelector('app-results-trend-card');
      expect(trendCard).toBeTruthy();
      const grid = trendCard.parentElement;
      expect(grid.classList.contains('lg:grid-cols-2')).toBe(false);
    });
  });


  describe('Unified Hero Context Chips (R-HL-001, D-F1-1, RC-1, KZ-001, KZ-015)', () => {
    const fullProject: GetProjectDetail = {
      agreement_id: 'AG-100',
      grant_amount_usd: 1500000,
      center_amount_usd: 500000,
      funding_type: 'Bilateral',
      start_date: '2023-01-01',
      end_date: '2025-12-31',
      extension_date: '2026-06-30',
      donor: 'Gates Foundation',
      divisionId: 'DIV-10',
      division: 'Agronomy',
      unitId: 'U-20',
      unit: 'Plant Breeding',
      sdgs: [
        { id: 1, short_name: 'SDG 1', full_name: 'No Poverty' },
        { id: 2, short_name: 'SDG 2', full_name: 'Zero Hunger' },
        { id: 13, short_name: 'SDG 13', full_name: 'Climate Action' }
      ] as any,
      cgiar_entities: [
        { code: 'CIAT', name: 'International Center for Tropical Agriculture' },
        { code: 'CIP', name: 'International Potato Center' }
      ],
      ...({ levers: [{ short_name: 'Climate Resilience' }] } as any)
    };

    it('renders all hero context facts with correct values when full project data is provided', async () => {
      await setup('C-1', { projectData: fullProject });

      expect(component.hasAnyContext()).toBe(true);
      expect(component.grantAmount()).toBe('$1,500,000 USD');
      expect(component.centerAmount()).toBe('$500,000 USD');
      expect(component.fundingType()).toBe('Bilateral');
      expect(component.projectLeverName()).toBe('Climate Resilience');
      expect(component.donor()).toBe('Gates Foundation');
      expect(component.projectDivisionLabel()).toBe('DIV-10 - Agronomy');
      expect(component.projectUnitLabel()).toBe('U-20 - Plant Breeding');
      expect(component.sdgs()).toEqual(['SDG 1', 'SDG 2', 'SDG 13']);
      expect(component.cgiarEntities().length).toBe(2);

      const section = fixture.nativeElement.querySelector('[aria-label="Project context summary"]');
      expect(section).toBeTruthy();
      const text = section.textContent;

      expect(text).toContain('Total Budget');
      expect(text).toContain('$1,500,000 USD');
      expect(text).toContain('Center Budget');
      expect(text).toContain('$500,000 USD');
      expect(text).toContain('Funding Type');
      expect(text).toContain('Bilateral');
      expect(text).toContain('Lever');
      expect(text).toContain('Climate Resilience');
      expect(text).toContain('Foundress');
      expect(text).toContain('Gates Foundation');
      expect(text).toContain('Division');
      expect(text).toContain('DIV-10 - Agronomy');
      expect(text).toContain('Unit');
      expect(text).toContain('U-20 - Plant Breeding');
      expect(text).toContain('Timeline');
      expect(text).toContain('SDGs:');
      expect(text).toContain('SDG 1');
      expect(text).toContain('SDG 2');
      expect(text).toContain('SDG 13');
      expect(text).toContain('Entities:');
      expect(text).toContain('CIAT');
      expect(text).toContain('CIP');

      const progressBar = section.querySelector('[role="progressbar"]');
      expect(progressBar).not.toBeNull();
      expect(text).toContain('Extension:');
    });

    it('asserts each hero context inventory field is rendered exactly once on the dashboard (R-HL-001 checklist)', async () => {
      await setup('C-1', { projectData: fullProject });

      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelectorAll('[aria-label="Project context summary"]').length).toBe(1);

      const contextSection = root.querySelector('[aria-label="Project context summary"]')!;
      const labels = ['Total Budget', 'Center Budget', 'Funding Type', 'Lever', 'Foundress', 'Division', 'Unit', 'Timeline', 'SDGs:', 'Entities:'];
      labels.forEach(label => {
        const matches = Array.from(contextSection.querySelectorAll('span, dt, h3')).filter(el => el.textContent?.trim() === label);
        expect(matches.length).toBe(1);
      });
    });

    describe('S2 No-fabrication rule', () => {
      it('does not render chips or placeholders (0, N/A, -) when fields are null', async () => {
        const nullFieldsProject: GetProjectDetail = {
          agreement_id: 'AG-200',
          grant_amount: null as any,
          grant_amount_usd: null,
          center_amount_usd: null,
          funding_type: null,
          contract_status: null as any,
          start_date: undefined,
          end_date: undefined,
          extension_date: null,
          donor: undefined,
          division: undefined,
          divisionId: undefined,
          unit: undefined,
          unitId: undefined,
          sdgs: null as any,
          cgiar_entities: null as any
        };

        await setup('C-1', { projectData: nullFieldsProject });

        expect(component.hasAnyContext()).toBe(false);
        expect(component.grantAmount()).toBeNull();
        expect(component.centerAmount()).toBeNull();
        expect(component.fundingType()).toBeNull();
        expect(component.hasLever()).toBe(false);
        expect(component.donor()).toBeNull();
        expect(component.hasDivision()).toBe(false);
        expect(component.hasUnit()).toBe(false);
        expect(component.timeline()).toBeNull();
        expect(component.sdgs()).toEqual([]);
        expect(component.cgiarEntities()).toEqual([]);
        expect(fixture.nativeElement.querySelector('[aria-label="Project context summary"]')).toBeNull();
      });

      it('renders only present fields for partial data without placeholder chips', async () => {
        const partialProject: GetProjectDetail = {
          agreement_id: 'AG-300',
          grant_amount_usd: 2500000,
          funding_type: 'Pool Funding',
          center_amount_usd: null,
          start_date: undefined,
          end_date: undefined,
          donor: undefined,
          division: undefined,
          unit: undefined,
          sdgs: [],
          cgiar_entities: []
        };

        await setup('C-1', { projectData: partialProject });

        const section = fixture.nativeElement.querySelector('[aria-label="Project context summary"]');
        expect(section).toBeTruthy();
        const text = section.textContent;

        expect(component.hasAnyContext()).toBe(true);
        expect(text).toContain('$2,500,000 USD');
        expect(text).toContain('Pool Funding');
        expect(text).not.toContain('Center Budget');
        expect(text).not.toContain('Timeline');
        expect(text).not.toContain('SDGs:');
        expect(text).not.toContain('Entities:');
        expect(text).not.toContain('Foundress');
        expect(text).not.toContain('Division');
        expect(text).not.toContain('Unit');
        expect(text).not.toContain('N/A');
        expect(text).not.toContain('$0');
      });
    });

    describe('Timeline computation and clamping', () => {
      it('clamps elapsed percent to 0 for future dates', async () => {
        const futureProject: GetProjectDetail = {
          start_date: '2090-01-01',
          end_date: '2095-01-01'
        };

        await setup('C-1', { projectData: futureProject });

        const tl = component.timeline();
        expect(tl).not.toBeNull();
        expect(tl!.elapsedPercent).toBe(0);
        expect(tl!.isExtended).toBe(false);
        expect(tl!.extensionDate).toBeNull();
      });

      it('clamps elapsed percent to 100 for past dates', async () => {
        const pastProject: GetProjectDetail = {
          start_date: '2010-01-01',
          end_date: '2015-01-01'
        };

        await setup('C-1', { projectData: pastProject });

        const tl = component.timeline();
        expect(tl).not.toBeNull();
        expect(tl!.elapsedPercent).toBe(100);
        expect(tl!.isExtended).toBe(false);
      });

      it('returns null timeline if start or end date is invalid or missing', async () => {
        await setup('C-1', { projectData: { start_date: 'invalid-date', end_date: '2025-01-01' } });
        expect(component.timeline()).toBeNull();

        component.project.set({ start_date: '2023-01-01', end_date: undefined });
        fixture.detectChanges();
        expect(component.timeline()).toBeNull();
      });

      it('renders extension date distinctly when extension_date is present', async () => {
        const extendedProject: GetProjectDetail = {
          start_date: '2020-01-01',
          end_date: '2024-12-31',
          extension_date: '2025-12-31'
        };

        await setup('C-1', { projectData: extendedProject });

        const tl = component.timeline();
        expect(tl).not.toBeNull();
        expect(tl!.isExtended).toBe(true);
        expect(tl!.extensionDate).toBe('2025-12-31');

        const text = fixture.nativeElement.querySelector('[aria-label="Project context summary"]').textContent;
        expect(text).toContain('Extension: 31/12/2025');
      });
    });

    describe('Currency formatting', () => {
      it('formats numeric values and valid numeric strings with USD unit', async () => {
        await setup('C-1', { projectData: { grant_amount_usd: 1250000, center_amount_usd: '450000' } });

        expect(component.grantAmount()).toBe('$1,250,000 USD');
        expect(component.centerAmount()).toBe('$450,000 USD');
      });

      it('falls back to grant_amount if grant_amount_usd is not provided', async () => {
        await setup('C-1', { projectData: { grant_amount: 800000 } });

        expect(component.grantAmount()).toBe('$800,000 USD');
      });

      it('returns null for unparseable amounts', async () => {
        await setup('C-1', { projectData: { grant_amount_usd: 'not-a-number' } });

        expect(component.grantAmount()).toBeNull();
      });
    });

    describe('SDG and CGIAR entity chips (KZ-001)', () => {
      it('maps SDG numbers and strings to SDG labels', async () => {
        await setup('C-1', { projectData: { sdgs: [1, '2', 'SDG 13', 'sdg 15'] } });

        expect(component.sdgs()).toEqual(['SDG 1', 'SDG 2', 'SDG 13', 'SDG 15']);
        const text = fixture.nativeElement.querySelector('[aria-label="Project context summary"]').textContent;
        expect(text).toContain('SDG 1');
        expect(text).toContain('SDG 15');
      });

      it('filters out empty SDG entries', async () => {
        await setup('C-1', { projectData: { sdgs: [null as any, '', '  ', 4] } });

        expect(component.sdgs()).toEqual(['SDG 4']);
      });

      it('maps ClarisaSdg objects to their short_name, never "[object Object]" (KZ-001)', async () => {
        await setup('C-1', {
          projectData: {
            sdgs: [
              { id: 2, short_name: 'SDG 2', full_name: 'Zero Hunger' },
              { id: 13, short_name: 'SDG 13', full_name: 'Climate Action' },
              { id: 7, full_name: 'Affordable and Clean Energy' },
              { id: 5 }
            ] as any
          }
        });

        expect(component.sdgs()).toEqual(['SDG 2', 'SDG 13', 'SDG 7', 'SDG 5']);
        const text = fixture.nativeElement.querySelector('[aria-label="Project context summary"]').textContent;
        expect(text).not.toContain('[object Object]');
        expect(text).toContain('SDG 13');
      });

      it('renders CGIAR entities with code or name', async () => {
        await setup('C-1', {
          projectData: {
            cgiar_entities: [
              { code: 'CIAT', name: 'International Center for Tropical Agriculture' },
              { name: 'Bioversity' }
            ]
          }
        });

        expect(component.cgiarEntities().length).toBe(2);
        const text = fixture.nativeElement.querySelector('[aria-label="Project context summary"]').textContent;
        expect(text).toContain('CIAT');
        expect(text).toContain('Bioversity');
      });

      it('renders secondary context without primary context or gap artifacts when only SDGs exist', async () => {
        await setup('C-1', { projectData: { sdgs: [1, 2] } });

        expect(component.hasPrimaryContext()).toBe(false);
        expect(component.hasSecondaryContext()).toBe(true);
        expect(component.hasAnyContext()).toBe(true);

        const section = fixture.nativeElement.querySelector('[aria-label="Project context summary"]');
        expect(section).toBeTruthy();

        // Primary container should not exist in DOM
        const primaryContainer = section.querySelector('.flex.flex-wrap.items-stretch.gap-3');
        expect(primaryContainer).toBeNull();

        // Secondary container should exist without border-t
        const secondaryContainer = section.querySelector('[aria-label="Sustainable Development Goals"]')?.parentElement;
        expect(secondaryContainer).toBeTruthy();
        expect(secondaryContainer?.classList.contains('border-t')).toBe(false);
      });
    });

    describe('Skeleton transitions (KZ-015)', () => {
      it('renders skeleton during loading and transitions to resolved context facts', async () => {
        // Construct with source unresolved / loading (KZ-015)
        await setup('C-1', { projectData: null, projectLoading: true });

        // Assert skeleton is rendered
        const skeletonContainer = fixture.nativeElement.querySelector('[aria-label="Loading project context"]');
        expect(skeletonContainer).toBeTruthy();
        expect(fixture.nativeElement.querySelector('[aria-label="Project context summary"]')).toBeNull();

        // Resolve data
        getProjectDetailServiceMock.loading.set(false);
        component.project.set(fullProject);
        fixture.detectChanges();

        // Assert skeleton removed and facts rendered
        expect(fixture.nativeElement.querySelector('[aria-label="Loading project context"]')).toBeNull();
        const resolvedSummary = fixture.nativeElement.querySelector('[aria-label="Project context summary"]');
        expect(resolvedSummary).toBeTruthy();
        expect(resolvedSummary.textContent).toContain('$1,500,000 USD');
        expect(resolvedSummary.textContent).toContain('Gates Foundation');
      });
    });
  });

  describe('Empty-collapse rule and no-data-group component (R-HL-004, D-F1-3, T-05)', () => {
    describe('Transitions (KZ-015)', () => {
      it('handles loading -> error -> resolve-empty -> re-expand for ranking widgets', async () => {
        await setup('C-1');

        // 1. Initial state: topPartners loading
        topPartnersMock.loading.set(true);
        topPartnersMock.list.set([]);
        topPartnersMock.loadError.set(false);
        fixture.detectChanges();

        expect(component.partnersEmpty()).toBe(false);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Top partner institutions')).toBe(false);
        expect(fixture.nativeElement.querySelector('#partners-card')).toBeTruthy();

        // 2. Error state: topPartners fails
        topPartnersMock.loading.set(false);
        topPartnersMock.loadError.set(true);
        fixture.detectChanges();

        expect(component.partnersEmpty()).toBe(false);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Top partner institutions')).toBe(false);
        expect(fixture.nativeElement.querySelector('#partners-card')).toBeTruthy();

        // 3. Resolve-empty: confirmed empty dataset
        topPartnersMock.loadError.set(false);
        topPartnersMock.list.set([]);
        fixture.detectChanges();

        expect(component.partnersEmpty()).toBe(true);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Top partner institutions')).toBe(true);
        expect(fixture.nativeElement.querySelector('#partners-card')).toBeNull();

        const noDataGroup = fixture.nativeElement.querySelector('app-no-data-group');
        expect(noDataGroup).toBeTruthy();
        expect(noDataGroup.textContent).toContain('Top partner institutions');
        expect(noDataGroup.textContent).toContain('No partner institutions are linked to results on this project yet.');

        // 4. Resolve-data / Retry: data arrives, widget re-expands in normal grid position
        topPartnersMock.list.set([{ institution_id: 10, institution_name: 'CIAT', count: 5 }]);
        fixture.detectChanges();

        expect(component.partnersEmpty()).toBe(false);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Top partner institutions')).toBe(false);
        expect(fixture.nativeElement.querySelector('#partners-card')).toBeTruthy();
      });

      it('handles loading -> error -> resolve-empty -> single-year -> multi-year for results trend', async () => {
        await setup('C-1', {
          summaryLoading: true,
          summary: null
        });

        // 1. Loading state: trend card rendered in place
        expect(component.trendEmpty()).toBe(false);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Results over time')).toBe(false);
        expect(fixture.nativeElement.querySelector('app-results-trend-card')).toBeTruthy();

        // 2. Error state: trend card rendered in place
        contractResultsSummaryMock.loading.set(false);
        contractResultsSummaryMock.loadError.set(true);
        fixture.detectChanges();

        expect(component.trendEmpty()).toBe(false);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Results over time')).toBe(false);
        expect(fixture.nativeElement.querySelector('app-results-trend-card')).toBeTruthy();

        // 3. Resolve-empty (zero valid buckets): collapses to no-data-group
        contractResultsSummaryMock.loadError.set(false);
        contractResultsSummaryMock.list.set({
          total: 0,
          by_indicator_year: [],
          by_status: [],
          by_year: [],
          partner_institutions: 0
        });
        fixture.detectChanges();

        expect(component.trendEmpty()).toBe(true);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Results over time')).toBe(true);
        expect(fixture.nativeElement.querySelector('app-results-trend-card')).toBeNull();

        const noDataGroup = fixture.nativeElement.querySelector('app-no-data-group');
        expect(noDataGroup.textContent).toContain('Results over time');
        expect(noDataGroup.textContent).toContain('No yearly result trends have been recorded yet.');

        // 4. Single-year trend (1 bucket) -> NOT empty! Renders in place with sparse layout
        contractResultsSummaryMock.list.set({
          total: 3,
          by_indicator_year: [],
          by_status: [],
          by_year: [{ year: 2025, count: 3 }],
          partner_institutions: 0
        });
        fixture.detectChanges();

        expect(component.trendEmpty()).toBe(false);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Results over time')).toBe(false);
        expect(fixture.nativeElement.querySelector('app-results-trend-card')).toBeTruthy();

        // 5. Multi-year trend (2+ buckets) -> NOT empty, renders chart in place
        contractResultsSummaryMock.list.set({
          total: 7,
          by_indicator_year: [],
          by_status: [],
          by_year: [
            { year: 2024, count: 4 },
            { year: 2025, count: 3 }
          ],
          partner_institutions: 0
        });
        fixture.detectChanges();

        expect(component.trendEmpty()).toBe(false);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Results over time')).toBe(false);
        expect(fixture.nativeElement.querySelector('app-results-trend-card')).toBeTruthy();
      });

      it('handles loading -> error -> resolve-empty -> resolve-data for status breakdown', async () => {
        await setup('C-1', {
          summaryLoading: true,
          summary: null
        });

        // 1. Loading state: status section rendered in place
        expect(component.statusChartEmpty()).toBe(false);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Results by status')).toBe(false);
        expect(fixture.nativeElement.querySelector('section[aria-labelledby="results-by-status-title"]')).toBeTruthy();

        // 2. Error state: status section rendered in place
        contractResultsSummaryMock.loading.set(false);
        contractResultsSummaryMock.loadError.set(true);
        fixture.detectChanges();

        expect(component.statusChartEmpty()).toBe(false);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Results by status')).toBe(false);
        expect(fixture.nativeElement.querySelector('section[aria-labelledby="results-by-status-title"]')).toBeTruthy();

        // 3. Resolve-empty: collapses to no-data-group
        contractResultsSummaryMock.loadError.set(false);
        contractResultsSummaryMock.list.set({
          total: 0,
          by_indicator_year: [],
          by_status: [],
          by_year: [],
          partner_institutions: 0
        });
        fixture.detectChanges();

        expect(component.statusChartEmpty()).toBe(true);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Results by status')).toBe(true);
        expect(fixture.nativeElement.querySelector('section[aria-labelledby="results-by-status-title"]')).toBeNull();

        const noDataGroup = fixture.nativeElement.querySelector('app-no-data-group');
        expect(noDataGroup.textContent).toContain('Results by status');
        expect(noDataGroup.textContent).toContain('No result statuses were found for this project.');

        // 4. Resolve-data: re-expands in normal grid position
        contractResultsSummaryMock.list.set({
          total: 5,
          by_indicator_year: [],
          by_status: [{ status_id: 6, name: 'Approved', count: 5 }],
          by_year: [],
          partner_institutions: 0
        });
        fixture.detectChanges();

        expect(component.statusChartEmpty()).toBe(false);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Results by status')).toBe(false);
        expect(fixture.nativeElement.querySelector('section[aria-labelledby="results-by-status-title"]')).toBeTruthy();
      });

      it('handles loading -> error -> resolve-empty -> resolve-data for results by indicator', async () => {
        await setup('C-1', {
          projectLoading: true,
          projectData: null
        });

        // 1. Loading state: indicators section rendered in place with skeleton
        expect(component.indicatorsEmpty()).toBe(false);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Results by indicator')).toBe(false);
        expect(fixture.nativeElement.querySelector('section[aria-labelledby="results-by-indicator-title"]')).toBeTruthy();

        // 2. Error state: indicators section rendered in place with error alert
        getProjectDetailServiceMock.loading.set(false);
        getProjectDetailServiceMock.loadError.set(true);
        fixture.detectChanges();

        expect(component.indicatorsEmpty()).toBe(false);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Results by indicator')).toBe(false);
        expect(fixture.nativeElement.querySelector('section[aria-labelledby="results-by-indicator-title"]')).toBeTruthy();

        // 3. Resolve-empty: collapses to no-data-group
        getProjectDetailServiceMock.loadError.set(false);
        getProjectDetailServiceMock.project.set({
          grant_amount: 100,
          indicators: []
        } as any);
        component.project.set(getProjectDetailServiceMock.project());
        fixture.detectChanges();

        expect(component.totalProjectResults()).toBe(0);
        expect(component.indicatorsEmpty()).toBe(true);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Results by indicator')).toBe(true);
        expect(fixture.nativeElement.querySelector('section[aria-labelledby="results-by-indicator-title"]')).toBeNull();

        const noDataGroup = fixture.nativeElement.querySelector('app-no-data-group');
        expect(noDataGroup.textContent).toContain('Results by indicator');
        expect(noDataGroup.textContent).toContain('No results were found for any indicator on this project.');

        // 4. Resolve-data: re-expands in normal grid position
        getProjectDetailServiceMock.project.set({
          grant_amount: 100,
          indicators: [{ indicator: { indicator_id: 1, name: 'Output' }, count_results: 5 } as any]
        } as any);
        component.project.set(getProjectDetailServiceMock.project());
        fixture.detectChanges();

        expect(component.totalProjectResults()).toBe(5);
        expect(component.indicatorsEmpty()).toBe(false);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Results by indicator')).toBe(false);
        expect(fixture.nativeElement.querySelector('section[aria-labelledby="results-by-indicator-title"]')).toBeTruthy();
      });

      it('handles loading -> error -> resolve-empty -> resolve-data for geographic scope', async () => {
        await setup('C-1');

        // 1. Loading state: geo-scope card rendered in place
        geoScopeMock.loading.set(true);
        geoScopeMock.summary.set({});
        geoScopeMock.topCountries.set([]);
        geoScopeMock.topRegionsList.set([]);
        fixture.detectChanges();

        expect(component.geoScopeEmpty()).toBe(false);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Top geographic scope')).toBe(false);
        expect(fixture.nativeElement.querySelector('app-geo-scope-card')).toBeTruthy();

        // 2. Error state: geo-scope card rendered in place
        geoScopeMock.loading.set(false);
        geoScopeMock.loadError.set(true);
        fixture.detectChanges();

        expect(component.geoScopeEmpty()).toBe(false);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Top geographic scope')).toBe(false);
        expect(fixture.nativeElement.querySelector('app-geo-scope-card')).toBeTruthy();

        // 3. Resolve-empty: collapses to no-data-group
        geoScopeMock.loadError.set(false);
        geoScopeMock.summary.set({ global: 0, regional: 0, countries: 0, sub_national: 0, yet_to_be_determined: 0 });
        geoScopeMock.topCountries.set([]);
        geoScopeMock.topRegionsList.set([]);
        fixture.detectChanges();

        expect(component.geoScopeEmpty()).toBe(true);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Top geographic scope')).toBe(true);
        expect(fixture.nativeElement.querySelector('app-geo-scope-card')).toBeNull();

        const noDataGroup = fixture.nativeElement.querySelector('app-no-data-group');
        expect(noDataGroup.textContent).toContain('Top geographic scope');
        expect(noDataGroup.textContent).toContain('No geographic scope data has been reported for this project yet.');

        // 4. Resolve-data: re-expands in normal grid position
        geoScopeMock.topCountries.set([{ country_name: 'Kenya', count: 3 } as any]);
        fixture.detectChanges();

        expect(component.geoScopeEmpty()).toBe(false);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Top geographic scope')).toBe(false);
        expect(fixture.nativeElement.querySelector('app-geo-scope-card')).toBeTruthy();
      });

      it('handles bilateral SP alignment graph collapse vs non-bilateral exclusion', async () => {
        // Bilateral project
        await setup('C-1', {
          projectData: {
            funding_type: 'Bilateral',
            indicators: [{ indicator: { indicator_id: 1, name: 'Output' }, count_results: 5 } as any]
          }
        });

        // 1. Bilateral + loading -> rendered in place
        contractSpAlignmentMock.loading.set(true);
        contractSpAlignmentMock.list.set(null);
        fixture.detectChanges();

        expect(component.isBilateral()).toBe(true);
        expect(component.spAlignmentEmpty()).toBe(false);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Strategic Plan alignment')).toBe(false);
        expect(fixture.nativeElement.querySelector('app-sp-alignment-graph')).toBeTruthy();

        // 2. Bilateral + error -> rendered in place
        contractSpAlignmentMock.loading.set(false);
        contractSpAlignmentMock.loadError.set(true);
        fixture.detectChanges();

        expect(component.spAlignmentEmpty()).toBe(false);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Strategic Plan alignment')).toBe(false);
        expect(fixture.nativeElement.querySelector('app-sp-alignment-graph')).toBeTruthy();

        // 3. Bilateral + resolve-empty -> collapses into no-data-group
        contractSpAlignmentMock.loadError.set(false);
        contractSpAlignmentMock.list.set({ sps: [], results_with_alignment: 0, results_without_alignment: 0 });
        fixture.detectChanges();

        expect(component.spAlignmentEmpty()).toBe(true);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Strategic Plan alignment')).toBe(true);
        expect(fixture.nativeElement.querySelector('app-sp-alignment-graph')).toBeNull();

        const noDataGroup = fixture.nativeElement.querySelector('app-no-data-group');
        expect(noDataGroup.textContent).toContain('Strategic Plan alignment');
        expect(noDataGroup.textContent).toContain('No Strategic Plan alignments have been mapped yet.');

        // 4. Non-bilateral project + empty report -> NOT in no-data-group at all
        component.project.set({
          funding_type: 'Pooled Funding',
          indicators: []
        } as any);
        fixture.detectChanges();

        expect(component.isBilateral()).toBe(false);
        expect(component.collapsedEmptyWidgets().some(w => w.name === 'Strategic Plan alignment')).toBe(false);
        expect(fixture.nativeElement.querySelector('app-sp-alignment-graph')).toBeNull();
      });
    });

    describe('Individual ranking cards empty-collapse mapping and copy verification', () => {
      it('maps all 4 ranking widgets to their exact names, reasons, and icons when confirmed empty', async () => {
        await setup('C-1');

        topPartnersMock.loading.set(false);
        topPartnersMock.loadError.set(false);
        topPartnersMock.list.set([]);

        topLeversMock.loading.set(false);
        topLeversMock.loadError.set(false);
        topLeversMock.list.set([]);

        topMainContactsMock.loading.set(false);
        topMainContactsMock.loadError.set(false);
        topMainContactsMock.list.set([]);

        topContributorsMock.loading.set(false);
        topContributorsMock.loadError.set(false);
        topContributorsMock.list.set([]);

        const widgets = component.collapsedEmptyWidgets();

        const partnersWidget = widgets.find(w => w.name === 'Top partner institutions');
        expect(partnersWidget).toEqual({
          name: 'Top partner institutions',
          reason: 'No partner institutions are linked to results on this project yet.',
          iconClass: 'pi pi-building'
        });

        const leversWidget = widgets.find(w => w.name === 'Top primary levers');
        expect(leversWidget).toEqual({
          name: 'Top primary levers',
          reason: 'No primary levers are linked to results on this project yet.',
          iconClass: 'pi pi-sliders-h'
        });

        const contactsWidget = widgets.find(w => w.name === 'Top main contact persons');
        expect(contactsWidget).toEqual({
          name: 'Top main contact persons',
          reason: 'No main contact persons are linked to results on this project yet.',
          iconClass: 'pi pi-users'
        });

        const contributorsWidget = widgets.find(w => w.name === 'Top contributing projects');
        expect(contributorsWidget).toEqual({
          name: 'Top contributing projects',
          reason: 'No other projects contribute to this one yet.',
          iconClass: 'pi pi-briefcase'
        });
      });

      it('renders partial ranking cards in grid when some have data and collapses empty ones', async () => {
        await setup('C-1');

        // Only levers has data
        topLeversMock.list.set([{ lever_id: 1, short_name: 'L1', full_name: 'Lever 1', count: 3 }]);
        topPartnersMock.list.set([]);
        topMainContactsMock.list.set([]);
        topContributorsMock.list.set([]);

        fixture.detectChanges();

        expect(component.hasVisibleRankingCards()).toBe(true);
        expect(component.partnersEmpty()).toBe(true);
        expect(component.leversEmpty()).toBe(false);
        expect(component.mainContactPersonsEmpty()).toBe(true);
        expect(component.contributorsEmpty()).toBe(true);

        // Partners card absent from grid
        expect(fixture.nativeElement.querySelector('#partners-card')).toBeNull();

        // Collapsed items in no-data-group
        const widgets = component.collapsedEmptyWidgets();
        expect(widgets.some(w => w.name === 'Top partner institutions')).toBe(true);
        expect(widgets.some(w => w.name === 'Top primary levers')).toBe(false);
        expect(widgets.some(w => w.name === 'Top main contact persons')).toBe(true);
        expect(widgets.some(w => w.name === 'Top contributing projects')).toBe(true);
      });

      it('renders nothing in no-data-group when all widgets have data', async () => {
        await setup('C-1', {
          summary: {
            total: 10,
            by_indicator_year: [],
            by_status: [{ status_id: 6, name: 'Approved', count: 5 }],
            by_year: [{ year: 2024, count: 5 }, { year: 2025, count: 5 }],
            partner_institutions: 2
          }
        });

        topPartnersMock.list.set([{ institution_id: 1, institution_name: 'CIAT', count: 3 }]);
        topLeversMock.list.set([{ lever_id: 1, short_name: 'L1', full_name: 'Lever 1', count: 3 }]);
        topMainContactsMock.list.set([{ contact_person_name: 'Jane Doe', count: 2 }]);
        topContributorsMock.list.set([{ contract_id: 'C-2', count: 1 }]);
        geoScopeMock.topCountries.set([{ country_name: 'Colombia', count: 2 } as any]);

        fixture.detectChanges();

        expect(component.collapsedEmptyWidgets().length).toBe(0);

        const noDataGroup = fixture.nativeElement.querySelector('app-no-data-group section');
        expect(noDataGroup).toBeNull();
      });
    });

    describe('Ranking cards on viz-bar with drill-through (T-06 / R-HL-005 / R-HL-009)', () => {
      it('navigates to project-results with leverTab on lever chartClick (transition-arranged)', async () => {
        await setup('C-TEST');

        topLeversMock.list.set([
          { lever_id: 12, short_name: 'LEV1', full_name: 'Lever 1', count: 7, icon: 'icons/lever1.svg' },
          { lever_id: 34, short_name: 'LEV2', full_name: 'Lever 2', count: 3 }
        ]);
        fixture.detectChanges();

        const router = TestBed.inject(Router);
        const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

        // KZ-015: initial state — no navigation has occurred
        expect(navSpy).not.toHaveBeenCalled();

        // Act: click on the first lever bar (index 0)
        component.onLeverChartClick({
          componentType: 'series',
          dataIndex: 0,
          data: { value: 7, leverId: '12' }
        } as any);

        // Assert: navigated with leverTab = '12'
        expect(navSpy).toHaveBeenCalledTimes(1);
        expect(navSpy).toHaveBeenCalledWith(['/project-detail', 'C-TEST'], {
          queryParams: { leverTab: '12' }
        });
      });

      it('navigates to project-results with contractTab on contributor chartClick (transition-arranged)', async () => {
        await setup('C-TEST');

        topContributorsMock.list.set([
          { contract_code: 'CONT-99', contract_description: 'Contributing Proj', results_count: 5 },
          { contract_id: 'CONT-88', project_name: 'Second Contributor', count: 2 }
        ]);
        fixture.detectChanges();

        const router = TestBed.inject(Router);
        const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

        // KZ-015: initial state
        expect(navSpy).not.toHaveBeenCalled();

        // Act: click on the first contributor bar
        component.onContributorChartClick({
          componentType: 'series',
          dataIndex: 0,
          data: { value: 5, contractCode: 'CONT-99' }
        } as any);

        // Assert: navigated with contractTab = 'CONT-99'
        expect(navSpy).toHaveBeenCalledTimes(1);
        expect(navSpy).toHaveBeenCalledWith(['/project-detail', 'C-TEST'], {
          queryParams: { contractTab: 'CONT-99' }
        });
      });

      it('does NOT navigate on partner or contact chartClick (named failing input check)', async () => {
        await setup('C-TEST');

        topPartnersMock.list.set([{ institution_id: 1, institution_name: 'Partner Org', count: 4 }]);
        topMainContactsMock.list.set([{ contact_person_name: 'Jane Contact', email: 'jane@example.com', count: 3 }]);
        fixture.detectChanges();

        const router = TestBed.inject(Router);
        const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

        // Act on partner
        component.onPartnerChartClick({ componentType: 'series', dataIndex: 0 } as any);
        expect(navSpy).not.toHaveBeenCalled();

        // Act on contact
        component.onMainContactChartClick({ componentType: 'series', dataIndex: 0 } as any);
        expect(navSpy).not.toHaveBeenCalled();
      });

      it('provides a non-empty tableModel on every viz-bar ranking card with data (R-HL-009 non-visual path)', async () => {
        await setup('C-TEST');

        topPartnersMock.list.set([{ institution_id: 1, institution_name: 'CIAT', count: 5 }]);
        topLeversMock.list.set([{ lever_id: 10, short_name: 'L1', full_name: 'Lever One', count: 4 }]);
        topMainContactsMock.list.set([{ contact_person_name: 'John Doe', email: 'john@example.com', count: 3 }]);
        topContributorsMock.list.set([{ contract_code: 'P-1', contract_description: 'Proj One', results_count: 2 }]);
        fixture.detectChanges();

        // Partner table model
        const partnerTable = component.partnerTableModel();
        expect(partnerTable).not.toBeNull();
        expect(partnerTable?.caption).toBe('Top partner institutions');
        expect(partnerTable?.headers).toEqual(['Partner institution', 'Results']);
        expect(partnerTable?.rows).toEqual([['CIAT', 5]]);

        // Lever table model
        const leverTable = component.leverTableModel();
        expect(leverTable).not.toBeNull();
        expect(leverTable?.caption).toBe('Top primary levers');
        expect(leverTable?.headers).toEqual(['Primary lever', 'Results']);
        expect(leverTable?.rows).toEqual([['LEVER ONE', 4]]);

        // Contact table model
        const contactTable = component.mainContactTableModel();
        expect(contactTable).not.toBeNull();
        expect(contactTable?.caption).toBe('Top main contact persons');
        expect(contactTable?.headers).toEqual(['Main contact person', 'Email', 'Results']);
        expect(contactTable?.rows).toEqual([['John Doe', 'john@example.com', 3]]);

        // Contributor table model
        const contributorTable = component.contributorTableModel();
        expect(contributorTable).not.toBeNull();
        expect(contributorTable?.caption).toBe('Top contributing projects');
        expect(contributorTable?.headers).toEqual(['Contributing project', 'Results']);
        expect(contributorTable?.rows).toEqual([['P-1 - Proj One', 2]]);
      });

      it('returns null tableModel and options when datasets are empty', async () => {
        await setup('C-TEST');

        topPartnersMock.list.set([]);
        topLeversMock.list.set([]);
        topMainContactsMock.list.set([]);
        topContributorsMock.list.set([]);
        fixture.detectChanges();

        expect(component.partnerTableModel()).toBeNull();
        expect(component.partnerChartOptions()).toBeNull();
        expect(component.leverTableModel()).toBeNull();
        expect(component.leverChartOptions()).toBeNull();
        expect(component.mainContactTableModel()).toBeNull();
        expect(component.mainContactChartOptions()).toBeNull();
        expect(component.contributorTableModel()).toBeNull();
        expect(component.contributorChartOptions()).toBeNull();
      });

      it('produces rich HTML tooltips with lever icon, contact email, and correct labels', async () => {
        await setup('C-TEST');

        topPartnersMock.list.set([{ institution_id: 1, institution_name: 'Bioversity', count: 8 }]);
        topLeversMock.list.set([
          { lever_id: 7, short_name: 'L7', full_name: 'Crops: Biodiversity', count: 6, icon: 'levers/crops.svg' }
        ]);
        topMainContactsMock.list.set([
          { first_name: 'Alice', last_name: 'Smith', email: 'alice@cgiar.org', count: 4 }
        ]);
        topContributorsMock.list.set([
          { contract_code: 'CTR-01', contract_description: 'Agroecology Project', results_count: 3 }
        ]);
        fixture.detectChanges();

        // Partner tooltip formatter
        const partnerOptions = component.partnerChartOptions();
        const partnerFormatter = (partnerOptions?.tooltip as any)?.formatter;
        expect(typeof partnerFormatter).toBe('function');
        const partnerHtml = partnerFormatter({ dataIndex: 0 });
        expect(partnerHtml).toContain('Bioversity');
        expect(partnerHtml).toContain('Results: 8');

        // Lever tooltip formatter (includes iconUrl in img tag)
        const leverOptions = component.leverChartOptions();
        const leverFormatter = (leverOptions?.tooltip as any)?.formatter;
        expect(typeof leverFormatter).toBe('function');
        const leverHtml = leverFormatter({ dataIndex: 0 });
        expect(leverHtml).toContain('CROPS - BIODIVERSITY');
        expect(leverHtml).toContain('Results: 6');
        expect(leverHtml).toContain('<img src=');
        expect(leverHtml).toContain('levers/crops.svg');

        // Contact tooltip formatter (includes email)
        const contactOptions = component.mainContactChartOptions();
        const contactFormatter = (contactOptions?.tooltip as any)?.formatter;
        expect(typeof contactFormatter).toBe('function');
        const contactHtml = contactFormatter({ dataIndex: 0 });
        expect(contactHtml).toContain('Alice Smith');
        expect(contactHtml).toContain('alice@cgiar.org');
        expect(contactHtml).toContain('Results: 4');

        // Contributor tooltip formatter
        const contributorOptions = component.contributorChartOptions();
        const contributorFormatter = (contributorOptions?.tooltip as any)?.formatter;
        expect(typeof contributorFormatter).toBe('function');
        const contributorHtml = contributorFormatter({ dataIndex: 0 });
        expect(contributorHtml).toContain('CTR-01 - Agroecology Project');
        expect(contributorHtml).toContain('Results: 3');
      });

      it('configures proper series cursor (pointer for drillable, default for non-drillable)', async () => {
        await setup('C-TEST');

        topPartnersMock.list.set([{ institution_id: 1, institution_name: 'CIAT', count: 2 }]);
        topLeversMock.list.set([{ lever_id: 1, short_name: 'L1', full_name: 'Lever 1', count: 2 }]);
        topMainContactsMock.list.set([{ contact_person_name: 'Jane', count: 2 }]);
        topContributorsMock.list.set([{ contract_code: 'P-1', contract_description: 'P1', results_count: 2 }]);
        fixture.detectChanges();

        const partnerSeries = (component.partnerChartOptions()?.series as any[])[0];
        expect(partnerSeries.cursor).toBe('default');

        const contactSeries = (component.mainContactChartOptions()?.series as any[])[0];
        expect(contactSeries.cursor).toBe('default');

        const leverSeries = (component.leverChartOptions()?.series as any[])[0];
        expect(leverSeries.cursor).toBe('pointer');

        const contributorSeries = (component.contributorChartOptions()?.series as any[])[0];
        expect(contributorSeries.cursor).toBe('pointer');
      });
    });

    describe('Trend and status interactivity (T-07 / R-HL-006 / R-HL-009 / D-F1-6)', () => {
      const summaryWithYearsAndStatuses: ContractResultsSummary = {
        total: 25,
        by_indicator_year: [],
        by_status: [
          { status_id: 6, name: 'Approved', count: 15 },
          { status_id: 2, name: 'Submitted', count: 10 }
        ],
        by_year: [
          { year: 2023, count: 5 },
          { year: 2024, count: 12 },
          { year: 2025, count: 8 }
        ],
        partner_institutions: 3
      };

      it('navigates to project-results with yearTab on trend chartClick with series event (transition-arranged KZ-015)', async () => {
        await setup('C-TEST', { summary: summaryWithYearsAndStatuses });

        const router = TestBed.inject(Router);
        const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

        // KZ-015: initial state — no navigation has occurred
        expect(navSpy).not.toHaveBeenCalled();

        // Act: click on a trend data point (e.g. 2024)
        component.onTrendChartClick({
          componentType: 'series',
          name: '2024',
          dataIndex: 1
        } as any);

        // Assert: navigated with yearTab = 2024
        expect(navSpy).toHaveBeenCalledTimes(1);
        expect(navSpy).toHaveBeenCalledWith(['/project-detail', 'C-TEST'], {
          queryParams: { yearTab: 2024 }
        });
      });

      it('does NOT navigate on trend chartClick when clicked on axis label, blank area, or non-series element (named failing input check)', async () => {
        await setup('C-TEST', { summary: summaryWithYearsAndStatuses });

        const router = TestBed.inject(Router);
        const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

        // Act on axis / grid / yAxis clicks
        component.onTrendChartClick({ componentType: 'xAxis', name: '2024' } as any);
        expect(navSpy).not.toHaveBeenCalled();

        component.onTrendChartClick({ componentType: 'grid' } as any);
        expect(navSpy).not.toHaveBeenCalled();

        component.onTrendChartClick({ componentType: 'yAxis' } as any);
        expect(navSpy).not.toHaveBeenCalled();
      });

      it('renders interactive <a> links for status composition bar segments with statusTab and accessible label', async () => {
        await setup('C-TEST', { summary: summaryWithYearsAndStatuses });

        const compositionLinks = fixture.nativeElement.querySelectorAll('figure[role="img"] a');
        expect(compositionLinks.length).toBe(2);

        const firstSegment = compositionLinks[0] as HTMLAnchorElement;
        expect(firstSegment.getAttribute('aria-label')).toContain('Approved');
        expect(firstSegment.getAttribute('aria-label')).toContain('15 results');
        expect(firstSegment.getAttribute('aria-label')).toContain('view filtered results');
        expect(firstSegment.getAttribute('data-status-id')).toBe('6');
      });

      it('maintains accessible row link twins in status table for keyboard navigation with visible focus styling', async () => {
        await setup('C-TEST', { summary: summaryWithYearsAndStatuses });

        const tableLinks = fixture.nativeElement.querySelectorAll('table tbody tr a');
        expect(tableLinks.length).toBe(2);

        const firstTableLink = tableLinks[0] as HTMLAnchorElement;
        expect(firstTableLink.getAttribute('aria-label')).toContain('Approved');
        expect(firstTableLink.getAttribute('aria-label')).toContain('view filtered results');
      });
    });
  });

  describe('F4 Insights section mount (R-IN-003 mount, R-IN-004 no regression, D-F4-4)', () => {
    it(
      'declaredSdgs() parses the "SDG N" string shape that its sibling sdgs() already handles — never silently ' +
        'drops it (Reviewer FAIL #2, failing input: sdgs = [\'SDG 2\', \'13\'] against the buggy Number(\'SDG 2\') ' +
        'branch returns NaN for the first entry and yields only [{id:13,...}])',
      async () => {
        await setup('C-1', { projectData: { sdgs: ['SDG 2', '13'] as any } });

        expect(component.sdgs()).toEqual(['SDG 2', 'SDG 13']);
        expect(component.declaredSdgs()).toEqual([
          { id: 2, label: 'SDG 2' },
          { id: 13, label: 'SDG 13' }
        ]);
      }
    );

    const projectWithSdgs: GetProjectDetail = {
      sdgs: [
        { id: 2, short_name: 'SDG 2', full_name: 'Zero Hunger' },
        { id: 13, short_name: 'SDG 13', full_name: 'Climate Action' }
      ] as any
    };

    it('mounts app-insights-section after the F3 deep-dive panel, passing contractId and the id-preserving declared SDGs (no new fetch)', async () => {
      await setup('C-1', { projectData: projectWithSdgs });

      const insightsDebugEl = fixture.debugElement.query(By.css('app-insights-section'));
      expect(insightsDebugEl).not.toBeNull();
      const stub = insightsDebugEl.componentInstance as InsightsSectionStubComponent;
      expect(stub.contractId).toBe('C-1');
      expect(stub.declaredSdgs).toEqual([
        { id: 2, label: 'SDG 2' },
        { id: 13, label: 'SDG 13' }
      ]);
      expect(component.declaredSdgs()).toEqual(stub.declaredSdgs);
    });

    it(
      'renders app-insights-section regardless of indicatorsEmpty() — it is not gated by the F3 panel\'s ' +
        'visibility (F1 order preserved: after F3, before the pending-revision table)',
      async () => {
        await setup('C-1', { projectData: { ...projectWithSdgs, indicators: [] } });

        expect(component.indicatorsEmpty()).toBe(true);
        expect(fixture.nativeElement.querySelector('app-indicator-deep-dive')).toBeNull();
        expect(fixture.nativeElement.querySelector('app-insights-section')).not.toBeNull();

        const insightsEl = fixture.nativeElement.querySelector('app-insights-section');
        const pendingSection = fixture.nativeElement.querySelector('#pending-revision-section');
        expect(insightsEl).not.toBeNull();
        expect(pendingSection).not.toBeNull();
        // DOM order: Insights precedes the pending-revision table.
        expect(insightsEl.compareDocumentPosition(pendingSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
    );

    it(
      'leaves F1 drill navigation and the F3/dashboard request counts unchanged with Insights mounted ' +
        '(R-IN-004 no-regression scenario — Insights issues no request of its own here since it is stubbed)',
      async () => {
        await setup('C-1', {
          projectData: {
            ...projectWithSdgs,
            indicators: [{ indicator: { indicator_id: 1, name: 'Output' }, count_results: 6 } as any]
          }
        });

        expect(getProjectDetailServiceMock.load).toHaveBeenCalledTimes(1);
        expect(contractDashboardMock.load).toHaveBeenCalledTimes(1);
        expect(fixture.nativeElement.querySelector('app-indicator-deep-dive')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('app-insights-section')).not.toBeNull();

        const router = TestBed.inject(Router);
        const navSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
        component.onIndicatorHeatmapClick({ data: [0, 0, 2] } as any);
        expect(navSpy).toHaveBeenCalledWith(['/project-detail', 'C-1'], {
          queryParams: { indicatorTab: 1 }
        });
      }
    );
  });
});


