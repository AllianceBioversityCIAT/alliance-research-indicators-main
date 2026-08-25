import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, NavigationEnd, ParamMap, PRIMARY_OUTLET, Router, RouterOutlet } from '@angular/router';
import { DatePipe } from '@angular/common';
import { BehaviorSubject, Subject } from 'rxjs';
import ProjectDetailComponent from './project-detail.component';
import { ApiService } from '@services/api.service';
import { GetProjectDetailService } from '@shared/services/get-project-detail.service';
import { RolesService } from '@services/cache/roles.service';
import { ResultsCenterService } from '../results-center/results-center.service';
import { BilateralService } from '@shared/services/bilateral.service';
import { GetContractStaffService } from '@shared/services/get-contract-staff.service';
import { GetProjectDetail } from '@shared/interfaces/get-project-detail.interface';
import { GetContractDashboardService } from '@shared/services/get-contract-dashboard.service';
import { GetContractInsightsService } from '@shared/services/get-contract-insights.service';
import { GetClarisaProjectService } from '@shared/services/get-clarisa-project.service';

@Component({
  selector: 'app-results-center-table',
  standalone: true,
  template: ''
})
class ResultsCenterTableStubComponent {
  @Input() showNewProjectResultButton = false;
  @Input() roundedBottom = false;
}

@Component({
  selector: 'app-project-indicator-filters',
  standalone: true,
  template: ''
})
class ProjectIndicatorFiltersStubComponent {
  @Input() project: any;
  @Input() enableFilter = false;
  @Output() indicatorClick = new EventEmitter();
}

@Component({
  selector: 'app-table-filters-sidebar',
  standalone: true,
  template: ''
})
class TableFiltersSidebarStubComponent {
  @Input() hideProjectFilter = false;
}

@Component({
  selector: 'app-table-configuration',
  standalone: true,
  template: ''
})
class TableConfigurationStubComponent {
  @Input() excludedColumns: string[] = [];
  applyConfigurations = jest.fn();
}

@Component({
  selector: 'app-section-sidebar',
  standalone: true,
  template: '<ng-content></ng-content>'
})
class SectionSidebarStubComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() showSignal = signal(false);
  @Input() confirmText = '';
  @Output() confirm = new EventEmitter();
}

@Component({
  selector: 'app-custom-tag',
  standalone: true,
  template: ''
})
class CustomTagStubComponent {
  @Input() statusId: any;
  @Input() statusName = '';
  @Input() tiny = false;
}

describe('ProjectDetailComponent', () => {
  let component: ProjectDetailComponent;
  let fixture: ComponentFixture<ProjectDetailComponent>;
  let apiService: { GET_ResultsCount: jest.Mock };
  let getProjectDetailService: { project: ReturnType<typeof signal<GetProjectDetail | null>>; loading: ReturnType<typeof signal<boolean>>; loadError: ReturnType<typeof signal<boolean>>; load: jest.Mock; invalidate: jest.Mock };
  // changes/dashboard-refresh T-01, R-DRF-001: minimal mocks — this task only exercises invalidate() being called on destroy.
  let contractDashboardService: { invalidate: jest.Mock };
  let contractInsightsService: { invalidate: jest.Mock };
  let clarisaProjectService: { invalidate: jest.Mock };
  let queryParamMapSubject: BehaviorSubject<ParamMap>;
  let activatedRoute: { snapshot: { params: { id: string }; queryParamMap: ParamMap }; queryParamMap: ReturnType<typeof queryParamMapSubject.asObservable> };
  let router: {
    url: string;
    events: Subject<NavigationEnd>;
    navigate: jest.Mock;
    parseUrl: jest.Mock;
  };
  let contractStaffService: { staff: ReturnType<typeof signal<any[]>>; loading: ReturnType<typeof signal<boolean>>; loadError: ReturnType<typeof signal<boolean>>; main: jest.Mock };
  let resultsCenterService: {
    primaryContractId: ReturnType<typeof signal<string>>;
    showFiltersSidebar: ReturnType<typeof signal<boolean>>;
    showConfigurationsSidebar: ReturnType<typeof signal<boolean>>;
    tableFilters: ReturnType<typeof signal<any>>;
    resultsFilter: ReturnType<typeof signal<any>>;
    appliedFilters: ReturnType<typeof signal<any>>;
    searchInput: ReturnType<typeof signal<string>>;
    myResultsFilterItem: ReturnType<typeof signal<any>>;
    myResultsFilterItems: { id: string; label: string }[];
    restorePersistedState: jest.Mock;
    activateStatePersistence: jest.Mock;
    deactivateStatePersistence: jest.Mock;
    resetState: jest.Mock;
    main: jest.Mock;
    applyFilters: jest.Mock;
    initializeScopedResultsTable: jest.Mock;
  };
  let bilateralService: {
    currentContract: ReturnType<typeof signal<{ is_pool_funding_contributor?: boolean } | null>>;
    getContract: jest.Mock;
  };
  let canAccessCenterAdminSignal: ReturnType<typeof signal<boolean>>;

  const parseUrlWithSegments = (...paths: string[]) => ({
    root: {
      children: {
        [PRIMARY_OUTLET]: {
          segments: paths.map(path => ({ path }))
        }
      }
    }
  });

  beforeEach(async () => {
    const emptyResultFilter = {
      'indicator-codes': [],
      'lever-codes': [],
      'indicator-codes-tabs': [],
      'indicator-codes-filter': [],
      'status-codes': [],
      'contract-codes': [],
      'platform-code': [],
      years: [],
      'create-user-codes': []
    };
    apiService = {
      GET_ResultsCount: jest.fn().mockResolvedValue({ data: {} })
    };
    getProjectDetailService = {
      project: signal<GetProjectDetail | null>(null),
      loading: signal(false),
      loadError: signal(false),
      load: jest.fn().mockImplementation((id: string) => {
        getProjectDetailService.load.mock.lastCall;
        return Promise.resolve();
      }),
      invalidate: jest.fn()
    };
    contractDashboardService = { invalidate: jest.fn() };
    contractInsightsService = { invalidate: jest.fn() };
    clarisaProjectService = { invalidate: jest.fn() };
    queryParamMapSubject = new BehaviorSubject<ParamMap>(convertToParamMap({}));
    activatedRoute = {
      snapshot: {
        params: { id: 'mock-id' },
        queryParamMap: convertToParamMap({})
      },
      queryParamMap: queryParamMapSubject.asObservable()
    };
    router = {
      url: '/projects/mock-id/project-results',
      events: new Subject<NavigationEnd>(),
      navigate: jest.fn(),
      parseUrl: jest.fn((url: string) => parseUrlWithSegments(...url.split('/').filter(Boolean)))
    };
    contractStaffService = {
      staff: signal([]),
      loading: signal(false),
      loadError: signal(false),
      main: jest.fn()
    };
    resultsCenterService = {
      primaryContractId: signal(''),
      showFiltersSidebar: signal(true),
      showConfigurationsSidebar: signal(true),
      tableFilters: signal({ indicators: [], statusCodes: [], sources: [], years: [], contracts: [], levers: [] }),
      resultsFilter: signal({ ...emptyResultFilter }),
      appliedFilters: signal({ ...emptyResultFilter }),
      searchInput: signal(''),
      myResultsFilterItems: [
        { id: 'all', label: 'All Results' },
        { id: 'my', label: 'My Results' }
      ],
      myResultsFilterItem: signal({ id: 'all', label: 'All Results' }),
      restorePersistedState: jest.fn(() => null),
      activateStatePersistence: jest.fn(),
      deactivateStatePersistence: jest.fn(),
      resetState: jest.fn(),
      main: jest.fn(),
      applyFilters: jest.fn(),
      initializeScopedResultsTable: jest.fn()
    };
    bilateralService = {
      currentContract: signal(null),
      getContract: jest.fn().mockResolvedValue(null)
    };
    canAccessCenterAdminSignal = signal(false);

    await TestBed.configureTestingModule({
      imports: [ProjectDetailComponent],
      providers: [
        { provide: ApiService, useValue: apiService },
        { provide: GetProjectDetailService, useValue: getProjectDetailService },
        { provide: GetContractDashboardService, useValue: contractDashboardService },
        { provide: GetContractInsightsService, useValue: contractInsightsService },
        { provide: GetClarisaProjectService, useValue: clarisaProjectService },
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: Router, useValue: router },
        { provide: ResultsCenterService, useValue: resultsCenterService },
        { provide: BilateralService, useValue: bilateralService },
        {
          provide: RolesService,
          useValue: { canAccessCenterAdmin: canAccessCenterAdminSignal }
        }
      ]
    })
      .overrideComponent(ProjectDetailComponent, {
        set: {
          imports: [
            ResultsCenterTableStubComponent,
            ProjectIndicatorFiltersStubComponent,
            TableFiltersSidebarStubComponent,
            TableConfigurationStubComponent,
            SectionSidebarStubComponent,
            CustomTagStubComponent,
            DatePipe,
            RouterOutlet
          ],
          providers: [{ provide: GetContractStaffService, useValue: contractStaffService }]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(ProjectDetailComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    router.events.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose dashboard and results tabs', () => {
    expect(component.tabs()).toEqual([
      { label: 'Project Dashboard', route: 'project-dashboard' },
      { label: 'Project Results', route: 'project-results' }
    ]);
  });

  it('should build the project title from the current project data', () => {
    component.currentProject.set({
      projectDescription: 'EMBRAPA',
      description: 'Establishment of the international coconut gene bank'
    });

    expect(component.projectTitle()).toBe('EMBRAPA - Establishment of the international coconut gene bank');
  });

  it('should expose the current project status', () => {
    component.currentProject.set({ contract_status: 'completed' });

    expect(component.projectStatus()).toEqual({ statusId: 2, statusName: 'Completed' });
  });

  it('should set contractId and initialize result state on ngOnInit', () => {
    const getProjectDetailSpy = jest.spyOn(component, 'getProjectDetail').mockResolvedValue(undefined);

    component.ngOnInit();

    expect(component.contractId()).toBe('mock-id');
    expect(resultsCenterService.primaryContractId()).toBe('mock-id');
    expect(resultsCenterService.activateStatePersistence).toHaveBeenCalledWith('project-detail:mock-id');
    expect(resultsCenterService.resetState).toHaveBeenCalled();
    expect(getProjectDetailSpy).toHaveBeenCalled();
    expect(bilateralService.getContract).toHaveBeenCalledWith('mock-id');
    expect(contractStaffService.main).toHaveBeenCalledWith('mock-id');

    getProjectDetailSpy.mockRestore();
  });

  it('should restore persisted results center state when available', () => {
    const getProjectDetailSpy = jest.spyOn(component, 'getProjectDetail').mockResolvedValue(undefined);
    resultsCenterService.restorePersistedState.mockReturnValue(true);

    component.ngOnInit();

    expect(resultsCenterService.main).toHaveBeenCalled();
    expect(resultsCenterService.resetState).not.toHaveBeenCalled();
    getProjectDetailSpy.mockRestore();
  });

  it('should discard a restored pending revision-only filter from the dashboard fixed table', () => {
    const getProjectDetailSpy = jest.spyOn(component, 'getProjectDetail').mockImplementation(jest.fn());
    resultsCenterService.restorePersistedState.mockReturnValue(true);
    resultsCenterService.tableFilters.set({
      indicators: [],
      statusCodes: [{ result_status_id: 5, name: 'Pending Revision' }],
      sources: [],
      years: [],
      contracts: [],
      levers: []
    });
    resultsCenterService.resultsFilter.update(prev => ({ ...prev, 'status-codes': [5] }));
    resultsCenterService.appliedFilters.update(prev => ({ ...prev, 'status-codes': [5] }));
    resultsCenterService.main.mockClear();
    resultsCenterService.resetState.mockClear();

    component.ngOnInit();

    expect(resultsCenterService.resetState).toHaveBeenCalled();
    expect(resultsCenterService.main).not.toHaveBeenCalled();
    getProjectDetailSpy.mockRestore();
  });

  it('should identify a pending revision-only filter when optional filter arrays are omitted', () => {
    resultsCenterService.tableFilters.set({
      indicators: [],
      statusCodes: [{ result_status_id: 5, name: 'Pending Revision' }],
      years: [],
      contracts: [],
      levers: []
    });
    resultsCenterService.resultsFilter.set({ 'status-codes': [5] });
    resultsCenterService.appliedFilters.set({ 'status-codes': [5] });

    expect((component as any).isOnlyPendingRevisionStatusFilter()).toBe(true);
  });

  it('should return false for result filter states without pending revision status', () => {
    expect((component as any).hasOnlyPendingRevisionResultFilter({})).toBe(false);
  });

  it('should update the last segment when navigation ends', () => {
    const getLastSegmentSpy = jest.spyOn(component, 'getLastSegment');
    router.url = '/projects/mock-id/project-dashboard';
    router.parseUrl.mockReturnValue(parseUrlWithSegments('projects', 'mock-id', 'project-dashboard'));
    component.ngOnInit();

    router.events.next(new NavigationEnd(1, '/projects/mock-id/project-dashboard', '/projects/mock-id/project-dashboard'));

    expect(getLastSegmentSpy).toHaveBeenCalled();
    expect(component.lastSegment()).toBe('project-dashboard');
  });

  it('should ignore router events that are not NavigationEnd', () => {
    const getLastSegmentSpy = jest.spyOn(component, 'getLastSegment');

    router.events.next({ type: 'NavigationStart' } as unknown as NavigationEnd);

    expect(getLastSegmentSpy).not.toHaveBeenCalled();
  });

  it('should keep project results as the selected segment when the URL ends with contract id or has no path', () => {
    component.contractId.set('mock-id');

    router.parseUrl.mockReturnValueOnce(parseUrlWithSegments('projects', 'mock-id'));
    component.getLastSegment();
    expect(component.lastSegment()).toBe('project-results');

    router.parseUrl.mockReturnValueOnce(parseUrlWithSegments());
    component.getLastSegment();
    expect(component.lastSegment()).toBe('project-results');
  });

  it('should keep project results selected when the primary outlet is missing', () => {
    router.parseUrl.mockReturnValueOnce({ root: { children: {} } });

    component.getLastSegment();

    expect(component.lastSegment()).toBe('project-results');
  });

  it('should navigate to the project results root tab and restore persisted state', () => {
    component.contractId.set('mock-id');
    resultsCenterService.restorePersistedState.mockReturnValue(true);

    component.onTabClick({ label: 'Project Results', route: 'project-results' });

    expect(component.lastSegment()).toBe('project-results');
    expect(router.navigate).toHaveBeenCalledWith(['./'], { relativeTo: activatedRoute });
    expect(resultsCenterService.restorePersistedState).toHaveBeenCalledWith('project-detail:mock-id');
    expect(resultsCenterService.resetState).not.toHaveBeenCalled();
    expect(resultsCenterService.main).toHaveBeenCalled();
  });

  it('should reset result state when project results tab has no persisted state', () => {
    component.contractId.set('mock-id');
    resultsCenterService.restorePersistedState.mockReturnValue(false);

    component.onTabClick({ label: 'Project Results', route: 'project-results' });

    expect(resultsCenterService.resetState).toHaveBeenCalled();
    expect(resultsCenterService.main).not.toHaveBeenCalled();
  });

  it('should navigate to child tabs', () => {
    component.contractId.set('mock-id');

    component.onTabClick({ label: 'Project Dashboard', route: 'project-dashboard' });

    expect(component.lastSegment()).toBe('project-dashboard');
    expect(resultsCenterService.deactivateStatePersistence).toHaveBeenCalledWith('project-detail:mock-id');
    expect(router.navigate).toHaveBeenCalledWith(['project-dashboard'], { relativeTo: activatedRoute });
  });

  it('should not activate project results persistence when initialized on the dashboard tab', () => {
    router.url = '/projects/mock-id/project-dashboard';
    resultsCenterService.restorePersistedState.mockClear();
    resultsCenterService.activateStatePersistence.mockClear();
    resultsCenterService.resetState.mockClear();

    const dashboardFixture = TestBed.createComponent(ProjectDetailComponent);
    const dashboardComponent = dashboardFixture.componentInstance;
    jest.spyOn(dashboardComponent, 'getProjectDetail').mockImplementation(jest.fn());

    dashboardFixture.detectChanges();

    expect(dashboardComponent.lastSegment()).toBe('project-dashboard');
    expect(resultsCenterService.restorePersistedState).not.toHaveBeenCalled();
    expect(resultsCenterService.activateStatePersistence).not.toHaveBeenCalled();
    expect(resultsCenterService.resetState).not.toHaveBeenCalled();

    dashboardFixture.destroy();
  });

  it('should deactivate persisted state, close sidebars, and invalidate the shared project cache on destroy', () => {
    component.contractId.set('mock-id');

    component.ngOnDestroy();

    expect(resultsCenterService.deactivateStatePersistence).toHaveBeenCalledWith('project-detail:mock-id');
    expect(resultsCenterService.showFiltersSidebar()).toBe(false);
    expect(resultsCenterService.showConfigurationsSidebar()).toBe(false);
    expect(getProjectDetailService.invalidate).toHaveBeenCalledWith('mock-id');
  });

  it('invalidates the dashboard, insights, and CLARISA-project caches for the contract on destroy (changes/dashboard-refresh T-01, R-DRF-001)', () => {
    // KZ-015: arrange the loaded state first, then act on the leave transition.
    component.contractId.set('mock-id');
    expect(contractDashboardService.invalidate).not.toHaveBeenCalled();
    expect(contractInsightsService.invalidate).not.toHaveBeenCalled();
    expect(clarisaProjectService.invalidate).not.toHaveBeenCalled();

    component.ngOnDestroy();

    expect(contractDashboardService.invalidate).toHaveBeenCalledWith('mock-id');
    expect(contractInsightsService.invalidate).toHaveBeenCalledWith('mock-id');
    expect(clarisaProjectService.invalidate).toHaveBeenCalledWith('mock-id');
  });

  it('should load project detail via the shared service and sync currentProject (full_name mutation deleted — D-PD-7)', async () => {
    const mockProject: GetProjectDetail = {
      agreement_id: 'A-1',
      indicators: [{ indicator: { name: 'Test' } } as any]
    };
    component.contractId.set('mock-id');
    getProjectDetailService.project.set(mockProject);
    getProjectDetailService.load.mockResolvedValue(undefined);

    await component.getProjectDetail();

    expect(getProjectDetailService.load).toHaveBeenCalledWith('mock-id');
    expect(component.currentProject()).toBe(mockProject);
    expect(component.currentProject()?.indicators?.[0]?.full_name).toBeUndefined();
  });

  it('should set currentProject from shared service when project has no indicators', async () => {
    const mockProject: GetProjectDetail = { agreement_id: 'A-1' };
    component.contractId.set('mock-id');
    getProjectDetailService.project.set(mockProject);

    await component.getProjectDetail();

    expect(component.currentProject()).toBe(mockProject);
  });

  it('should set currentProject to null when shared service has no project (null contract — D-PD-7)', async () => {
    component.contractId.set('mock-id');
    getProjectDetailService.project.set(null);

    await component.getProjectDetail();

    expect(component.currentProject()).toBeNull();
  });

  it('should not call GET_ResultsCount directly (delegation to shared service)', async () => {
    component.contractId.set('mock-id');
    getProjectDetailService.project.set(null);

    await component.getProjectDetail();

    expect(apiService.GET_ResultsCount).not.toHaveBeenCalled();
  });

  it('showPoolFundingBadge should reflect bilateralService.currentContract', () => {
    bilateralService.currentContract.set({ is_pool_funding_contributor: true });
    expect(component.showPoolFundingBadge()).toBe(true);

    bilateralService.currentContract.set({ is_pool_funding_contributor: false });
    expect(component.showPoolFundingBadge()).toBe(false);

    bilateralService.currentContract.set(null);
    expect(component.showPoolFundingBadge()).toBe(false);
  });

  it('canEditPoolFundingTag should mirror RolesService.canAccessCenterAdmin', () => {
    canAccessCenterAdminSignal.set(false);
    expect(component.canEditPoolFundingTag()).toBe(false);

    canAccessCenterAdminSignal.set(true);
    expect(component.canEditPoolFundingTag()).toBe(true);
  });

  describe('getContactInitials and display helpers', () => {
    it('should handle undefined current project for computed helpers', () => {
      component.currentProject.set(undefined as any);
      expect(component.projectLeverName()).toBe('-');
      expect(component.projectGrantAmount()).toBe('—');
      expect(component.projectTitle()).toBe('');
      expect(component.projectStatus()).toEqual({ statusId: 1, statusName: 'Ongoing' });
    });

    it('should expose lever name and empty staff state', () => {
      component.currentProject.set({ levers: [{ short_name: 'Lever A' }, { short_name: 'Lever B' }] } as any);
      expect(component.projectLeverName()).toContain('Lever A');

      contractStaffService.staff.set([]);
      contractStaffService.loading.set(false);
      contractStaffService.loadError.set(false);
      expect(component.staffEmpty()).toBe(true);
    });

    it('should handle empty project for title and status helpers', () => {
      component.currentProject.set({} as any);
      expect(component.projectTitle()).toBe('');
      expect(component.projectStatus()).toBeDefined();
    });

    it('should derive initials from comma-separated names', () => {
      expect(component.getContactInitials('Smith, John')).toBe('SJ');
    });

    it('should derive initials from space-separated names', () => {
      expect(component.getContactInitials('Jane Doe')).toBe('JD');
    });

    it('should fall back to a single initial or question mark', () => {
      expect(component.getContactInitials('Madonna')).toBe('M');
      expect(component.getContactInitials('')).toBe('?');
    });

    it('should format grant amount as USD currency', () => {
      component.currentProject.set({ grant_amount: 1250000 } as any);
      expect(component.projectGrantAmount()).toBe('$1,250,000');
    });

    it('should show em dash for non-finite grant amounts', () => {
      component.currentProject.set({ grant_amount: 'invalid' } as any);
      expect(component.projectGrantAmount()).toBe('—');
    });

    it('should format division and unit labels with code and name', () => {
      component.currentProject.set({ divisionId: 'DIV1', division: 'Research Division', unitId: 'U2', unit: 'Science Unit' } as any);
      expect(component.projectDivisionLabel()).toBe('DIV1 - Research Division');
      expect(component.projectUnitLabel()).toBe('U2 - Science Unit');
    });

    it('should format code labels with label-only, code-only, or em dash fallbacks', () => {
      component.currentProject.set({ division: '  Research  ', unitId: '  U9  ' } as any);
      expect(component.projectDivisionLabel()).toBe('Research');
      expect(component.projectUnitLabel()).toBe('U9');

      component.currentProject.set({} as any);
      expect(component.projectDivisionLabel()).toBe('—');
      expect(component.projectUnitLabel()).toBe('—');
    });
  });

  describe('onIndicatorClick', () => {
    it('should clear indicator filters, set the clicked indicator, and apply filters', () => {
      const updateSpy = jest.spyOn(component.resultsCenterService.tableFilters, 'update');
      const applyFiltersSpy = jest.spyOn(component.resultsCenterService, 'applyFilters');
      const indicator = { indicator_id: 1, name: 'Innovation Development' };

      component.onIndicatorClick(indicator);

      expect(updateSpy).toHaveBeenCalledTimes(2);
      expect(updateSpy).toHaveBeenNthCalledWith(1, expect.any(Function));
      const firstUpdateFn = updateSpy.mock.calls[0][0];
      expect(firstUpdateFn({ indicators: [{ indicator_id: 99, name: 'Previous' }] } as any)).toEqual({ indicators: [] });

      expect(updateSpy).toHaveBeenNthCalledWith(2, expect.any(Function));
      const secondUpdateFn = updateSpy.mock.calls[1][0];
      expect(secondUpdateFn({} as any)).toEqual({
        indicators: [{ indicator_id: 1, name: 'Innovation Development' }]
      });

      expect(applyFiltersSpy).toHaveBeenCalled();
    });
  });

  describe('queryParamMap drill-through (R-PD-003, R-PD-005, R-PD-008, S3, R-HL-005, R-HL-006)', () => {
    it('should handle live queryParamMap emission without component re-init (S3 router reuse)', () => {
      component.ngOnInit();
      router.navigate.mockClear();
      resultsCenterService.initializeScopedResultsTable.mockClear();

      // Emit statusTab=2 on live fixture (child->parent navigation without re-init)
      queryParamMapSubject.next(convertToParamMap({ statusTab: '2' }));

      expect(component.lastSegment()).toBe('project-results');
      expect(resultsCenterService.initializeScopedResultsTable).toHaveBeenCalledWith({
        contractId: 'mock-id',
        statusId: 2,
        indicatorId: undefined,
        leverId: undefined,
        contractCode: undefined,
        year: undefined
      });
      expect(router.navigate).toHaveBeenCalledWith([], {
        relativeTo: activatedRoute,
        queryParams: {},
        replaceUrl: true
      });
    });

    it('should survive reset guard when statusTab=5 is drilled (S3 discard case)', () => {
      component.ngOnInit();
      resultsCenterService.resetState.mockClear();
      resultsCenterService.initializeScopedResultsTable.mockClear();

      queryParamMapSubject.next(convertToParamMap({ statusTab: '5' }));

      expect(resultsCenterService.resetState).not.toHaveBeenCalled();
      expect(resultsCenterService.initializeScopedResultsTable).toHaveBeenCalledWith({
        contractId: 'mock-id',
        statusId: 5,
        indicatorId: undefined,
        leverId: undefined,
        contractCode: undefined,
        year: undefined
      });
    });

    it('should handle indicatorTab drill-through and strip params', () => {
      component.ngOnInit();
      router.navigate.mockClear();
      resultsCenterService.initializeScopedResultsTable.mockClear();

      queryParamMapSubject.next(convertToParamMap({ indicatorTab: '3' }));

      expect(component.lastSegment()).toBe('project-results');
      expect(resultsCenterService.initializeScopedResultsTable).toHaveBeenCalledWith({
        contractId: 'mock-id',
        statusId: undefined,
        indicatorId: 3,
        leverId: undefined,
        contractCode: undefined,
        year: undefined
      });
      expect(router.navigate).toHaveBeenCalledWith([], {
        relativeTo: activatedRoute,
        queryParams: {},
        replaceUrl: true
      });
    });

    it('should handle leverTab drill-through and strip params', () => {
      component.ngOnInit();
      router.navigate.mockClear();
      resultsCenterService.initializeScopedResultsTable.mockClear();

      queryParamMapSubject.next(convertToParamMap({ leverTab: '4' }));

      expect(component.lastSegment()).toBe('project-results');
      expect(resultsCenterService.initializeScopedResultsTable).toHaveBeenCalledWith({
        contractId: 'mock-id',
        statusId: undefined,
        indicatorId: undefined,
        leverId: 4,
        contractCode: undefined,
        year: undefined
      });
      expect(router.navigate).toHaveBeenCalledWith([], {
        relativeTo: activatedRoute,
        queryParams: {},
        replaceUrl: true
      });
    });

    it('should handle resultsTab (unfiltered results view) and strip params', () => {
      component.ngOnInit();
      router.navigate.mockClear();
      resultsCenterService.initializeScopedResultsTable.mockClear();

      queryParamMapSubject.next(convertToParamMap({ resultsTab: '1' }));

      expect(component.lastSegment()).toBe('project-results');
      expect(resultsCenterService.initializeScopedResultsTable).toHaveBeenCalledWith({
        contractId: 'mock-id',
        statusId: undefined,
        indicatorId: undefined,
        leverId: undefined,
        contractCode: undefined,
        year: undefined
      });
      expect(router.navigate).toHaveBeenCalledWith([], {
        relativeTo: activatedRoute,
        queryParams: {},
        replaceUrl: true
      });
    });

    it('should handle contractTab drill-through and strip params', () => {
      component.ngOnInit();
      router.navigate.mockClear();
      resultsCenterService.initializeScopedResultsTable.mockClear();

      queryParamMapSubject.next(convertToParamMap({ contractTab: 'CON-888' }));

      expect(component.lastSegment()).toBe('project-results');
      expect(resultsCenterService.initializeScopedResultsTable).toHaveBeenCalledWith({
        contractId: 'mock-id',
        statusId: undefined,
        indicatorId: undefined,
        leverId: undefined,
        contractCode: 'CON-888',
        year: undefined
      });
      expect(router.navigate).toHaveBeenCalledWith([], {
        relativeTo: activatedRoute,
        queryParams: {},
        replaceUrl: true
      });
    });

    it('should handle yearTab drill-through and strip params', () => {
      component.ngOnInit();
      router.navigate.mockClear();
      resultsCenterService.initializeScopedResultsTable.mockClear();

      queryParamMapSubject.next(convertToParamMap({ yearTab: '2026' }));

      expect(component.lastSegment()).toBe('project-results');
      expect(resultsCenterService.initializeScopedResultsTable).toHaveBeenCalledWith({
        contractId: 'mock-id',
        statusId: undefined,
        indicatorId: undefined,
        leverId: undefined,
        contractCode: undefined,
        year: 2026
      });
      expect(router.navigate).toHaveBeenCalledWith([], {
        relativeTo: activatedRoute,
        queryParams: {},
        replaceUrl: true
      });
    });

    it('should handle combined drill-through with all params and strip params', () => {
      component.ngOnInit();
      router.navigate.mockClear();
      resultsCenterService.initializeScopedResultsTable.mockClear();

      queryParamMapSubject.next(
        convertToParamMap({
          statusTab: '1',
          indicatorTab: '2',
          leverTab: '3',
          contractTab: 'CON-99',
          yearTab: '2025'
        })
      );

      expect(component.lastSegment()).toBe('project-results');
      expect(resultsCenterService.initializeScopedResultsTable).toHaveBeenCalledWith({
        contractId: 'mock-id',
        statusId: 1,
        indicatorId: 2,
        leverId: 3,
        contractCode: 'CON-99',
        year: 2025
      });
      expect(router.navigate).toHaveBeenCalledWith([], {
        relativeTo: activatedRoute,
        queryParams: {},
        replaceUrl: true
      });
    });

    it('should handle malformed leverTab, empty contractTab, and invalid yearTab gracefully', () => {
      component.ngOnInit();
      router.navigate.mockClear();
      resultsCenterService.initializeScopedResultsTable.mockClear();

      queryParamMapSubject.next(
        convertToParamMap({
          leverTab: 'abc',
          contractTab: '   ',
          yearTab: 'invalid'
        })
      );

      expect(component.lastSegment()).toBe('project-results');
      expect(resultsCenterService.initializeScopedResultsTable).toHaveBeenCalledWith({
        contractId: 'mock-id',
        statusId: undefined,
        indicatorId: undefined,
        leverId: undefined,
        contractCode: undefined,
        year: undefined
      });
      expect(router.navigate).toHaveBeenCalledWith([], {
        relativeTo: activatedRoute,
        queryParams: {},
        replaceUrl: true
      });
    });

    it('should handle non-positive leverTab and zero yearTab as undefined', () => {
      component.ngOnInit();
      router.navigate.mockClear();
      resultsCenterService.initializeScopedResultsTable.mockClear();

      queryParamMapSubject.next(
        convertToParamMap({
          leverTab: '0',
          yearTab: '0'
        })
      );

      expect(component.lastSegment()).toBe('project-results');
      expect(resultsCenterService.initializeScopedResultsTable).toHaveBeenCalledWith({
        contractId: 'mock-id',
        statusId: undefined,
        indicatorId: undefined,
        leverId: undefined,
        contractCode: undefined,
        year: undefined
      });
    });

    it('should handle no-status / null statusTab correctly', () => {
      component.ngOnInit();
      resultsCenterService.initializeScopedResultsTable.mockClear();

      queryParamMapSubject.next(convertToParamMap({ statusTab: 'no-status' }));

      expect(resultsCenterService.initializeScopedResultsTable).toHaveBeenCalledWith({
        contractId: 'mock-id',
        statusId: null,
        indicatorId: undefined,
        leverId: undefined,
        contractCode: undefined,
        year: undefined
      });
    });

    it('should do nothing if neither statusTab nor indicatorTab nor leverTab nor contractTab nor yearTab are present', () => {
      component.ngOnInit();
      resultsCenterService.initializeScopedResultsTable.mockClear();

      queryParamMapSubject.next(convertToParamMap({ otherParam: 'val' }));

      expect(resultsCenterService.initializeScopedResultsTable).not.toHaveBeenCalled();
    });
  });

  describe('Stable identity hero + tab affordance (R-EOC-010, R-EOC-011)', () => {
    const setProject = () => {
      component.currentProject.set({
        agreement_id: 'AG-123',
        description: 'Test Project',
        department: 'Science',
        grant_amount: 1500000,
        start_date: '2024-01-01',
        end_date: '2026-12-31',
        extension_date: '2027-06-30',
        donor: 'Donor Foundation',
        divisionId: 'DIV-1',
        division: 'Research',
        unitId: 'U-2',
        unit: 'Crops'
      });
    };

    it('renders an identical hero (no <dl>, same markup) on project-dashboard and after switching to project-results (R-EOC-010 AC1/AC3)', () => {
      router.url = '/projects/mock-id/project-dashboard';
      router.parseUrl.mockReturnValue(parseUrlWithSegments('projects', 'mock-id', 'project-dashboard'));
      component.ngOnInit();
      setProject();
      contractStaffService.staff.set([
        { name: 'Smith, John', role: 'Principal Investigator' },
        { name: 'Jane Doe', role: 'Co-Investigator' }
      ]);
      fixture.detectChanges();

      const heroOnDashboard = fixture.nativeElement.querySelector('header');
      expect(heroOnDashboard.querySelectorAll('dl').length).toBe(0);
      const dashboardHeroHtml = heroOnDashboard.innerHTML;

      // Arrange the TRANSITION (KZ-015): flip the SAME fixture to project-results.
      router.url = '/projects/mock-id/project-results';
      router.parseUrl.mockReturnValue(parseUrlWithSegments('projects', 'mock-id', 'project-results'));
      component.getLastSegment();
      fixture.detectChanges();

      const heroOnResults = fixture.nativeElement.querySelector('header');
      expect(heroOnResults.querySelectorAll('dl').length).toBe(0);
      expect(heroOnResults.innerHTML).toBe(dashboardHeroHtml);
    });

    it('shows the meta grid below the tab bar only on the non-dashboard state, never inside the hero (R-EOC-010 AC2)', () => {
      router.url = '/projects/mock-id/project-dashboard';
      router.parseUrl.mockReturnValue(parseUrlWithSegments('projects', 'mock-id', 'project-dashboard'));
      component.ngOnInit();
      setProject();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-testid="project-detail-meta-grid"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('header dl')).toBeNull();

      // Arrange the TRANSITION (KZ-015): flip the SAME fixture to project-results.
      router.url = '/projects/mock-id/project-results';
      router.parseUrl.mockReturnValue(parseUrlWithSegments('projects', 'mock-id', 'project-results'));
      component.getLastSegment();
      fixture.detectChanges();

      const metaGrid = fixture.nativeElement.querySelector('[data-testid="project-detail-meta-grid"]');
      expect(metaGrid).not.toBeNull();
      expect(fixture.nativeElement.querySelector('header dl')).toBeNull();

      const text = metaGrid.textContent;
      expect(text).toContain('Budget');
      expect(text).toContain('$1,500,000');
      expect(text).toContain('Start date');
      expect(text).toContain('01/01/2024');
      expect(text).toContain('End date');
      expect(text).toContain('31/12/2026');
      expect(text).toContain('Extension date');
      expect(text).toContain('30/06/2027');
      expect(text).toContain('Lever');
      expect(text).toContain('Foundress');
      expect(text).toContain('Donor Foundation');
      expect(text).toContain('Division');
      expect(text).toContain('DIV-1 - Research');
      expect(text).toContain('Unit');
      expect(text).toContain('U-2 - Crops');

      // Meta grid renders below (after, in document order) the tab bar.
      const tablist = fixture.nativeElement.querySelector('[role="tablist"]');
      expect(!!(tablist.compareDocumentPosition(metaGrid) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    });

    it('renders tablist/tab roles with aria-selected flipping across a tab switch (R-EOC-011 AC3)', () => {
      router.url = '/projects/mock-id/project-dashboard';
      router.parseUrl.mockReturnValue(parseUrlWithSegments('projects', 'mock-id', 'project-dashboard'));
      component.ngOnInit();
      fixture.detectChanges();

      const tablist = fixture.nativeElement.querySelector('[role="tablist"]');
      expect(tablist).not.toBeNull();
      const tabButtons: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('[role="tab"]'));
      expect(tabButtons.length).toBe(2);

      const dashboardTab = tabButtons.find(btn => btn.textContent?.includes('Project Dashboard'));
      const resultsTab = tabButtons.find(btn => btn.textContent?.includes('Project Results'));
      expect(dashboardTab?.getAttribute('aria-selected')).toBe('true');
      expect(resultsTab?.getAttribute('aria-selected')).toBe('false');

      // Arrange the TRANSITION (KZ-015): flip the SAME fixture to project-results.
      router.url = '/projects/mock-id/project-results';
      router.parseUrl.mockReturnValue(parseUrlWithSegments('projects', 'mock-id', 'project-results'));
      component.getLastSegment();
      fixture.detectChanges();

      expect(dashboardTab?.getAttribute('aria-selected')).toBe('false');
      expect(resultsTab?.getAttribute('aria-selected')).toBe('true');
    });

    it('renders the contacts row with one entry per contact person, on the dashboard state (R-EOC-010 AC1/AC4)', () => {
      contractStaffService.staff.set([
        { name: 'Smith, John', role: 'Principal Investigator' },
        { name: 'Jane Doe', role: 'Co-Investigator' },
        { name: 'Madonna', role: 'Advisor' }
      ]);
      router.url = '/projects/mock-id/project-dashboard';
      router.parseUrl.mockReturnValue(parseUrlWithSegments('projects', 'mock-id', 'project-dashboard'));
      component.ngOnInit();
      fixture.detectChanges();

      const contactsRow = fixture.nativeElement.querySelector('[data-testid="project-detail-contacts-row"]');
      expect(contactsRow).not.toBeNull();
      expect(contactsRow.querySelectorAll('article').length).toBe(3);
      expect(contactsRow.textContent).toContain('Smith, John');
      expect(contactsRow.textContent).toContain('Principal Investigator');
      expect(contactsRow.textContent).toContain('Jane Doe');
      expect(contactsRow.textContent).toContain('Madonna');
    });

    it('keeps the identity band (title + department) rendered on both tabs (R-EOC-010 AC1)', () => {
      router.url = '/projects/mock-id/project-dashboard';
      router.parseUrl.mockReturnValue(parseUrlWithSegments('projects', 'mock-id', 'project-dashboard'));
      component.ngOnInit();
      setProject();
      fixture.detectChanges();

      const headerText = fixture.nativeElement.querySelector('header').textContent;
      expect(headerText).toContain('AG-123 - Test Project');
      expect(headerText).toContain('Science Department');
    });
  });
});
