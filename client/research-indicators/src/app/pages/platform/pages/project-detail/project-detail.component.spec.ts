import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, PRIMARY_OUTLET, Router } from '@angular/router';
import { Subject } from 'rxjs';
import ProjectDetailComponent from './project-detail.component';
import { ApiService } from '@services/api.service';
import { RolesService } from '@services/cache/roles.service';
import { ResultsCenterService } from '../results-center/results-center.service';
import { BilateralService } from '@shared/services/bilateral.service';
import { GetContractStaffService } from '@shared/services/get-contract-staff.service';

describe('ProjectDetailComponent', () => {
  let component: ProjectDetailComponent;
  let fixture: ComponentFixture<ProjectDetailComponent>;
  let apiService: { GET_ResultsCount: jest.Mock };
  let activatedRoute: { snapshot: { params: { id: string } } };
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
    activatedRoute = {
      snapshot: {
        params: { id: 'mock-id' }
      }
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
      applyFilters: jest.fn()
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
          imports: [],
          providers: [{ provide: GetContractStaffService, useValue: contractStaffService }],
          template: `<div class="w-full"></div>`
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

  it('should deactivate persisted state and close sidebars on destroy', () => {
    component.contractId.set('mock-id');

    component.ngOnDestroy();

    expect(resultsCenterService.deactivateStatePersistence).toHaveBeenCalledWith('project-detail:mock-id');
    expect(resultsCenterService.showFiltersSidebar()).toBe(false);
    expect(resultsCenterService.showConfigurationsSidebar()).toBe(false);
  });

  it('should set currentProject with indicators and set full_name', async () => {
    const mockResponse = {
      data: {
        indicators: [{ indicator: { name: 'Test' } }]
      }
    };
    apiService.GET_ResultsCount.mockResolvedValue(mockResponse);

    await component.getProjectDetail();

    expect(component.currentProject()).toBe(mockResponse.data);
    expect(component.currentProject()?.indicators?.[0]?.full_name).toBe('Test');
  });

  it('should set currentProject with no indicators', async () => {
    const mockResponse = { data: {} };
    apiService.GET_ResultsCount.mockResolvedValue(mockResponse);

    await component.getProjectDetail();

    expect(component.currentProject()).toBe(mockResponse.data);
  });

  it('should clear currentProject for null responses', async () => {
    apiService.GET_ResultsCount.mockResolvedValue(null);

    await component.getProjectDetail();

    expect(component.currentProject()).toBe(undefined);
  });

  it('should clear currentProject for empty responses', async () => {
    apiService.GET_ResultsCount.mockResolvedValue({});

    await component.getProjectDetail();

    expect(component.currentProject()).toBe(undefined);
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
});
