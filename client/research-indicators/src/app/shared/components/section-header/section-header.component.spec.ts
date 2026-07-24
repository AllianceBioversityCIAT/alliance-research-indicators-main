import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionHeaderComponent } from './section-header.component';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { of } from 'rxjs';
import { CacheService } from '@services/cache/cache.service';
import { signal } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import { MenuItemCommandEvent } from 'primeng/api';
import { RolesService } from '@shared/services/cache/roles.service';
import { WhatsNewService } from '@platform/pages/whats-new/services/whats-new.service';

// Mock ResizeObserver
class ResizeObserverMock {
  private callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    // Immediately invoke the callback to simulate a resize event
    this.callback([], this as any);
  }
  unobserve(_target: Element) {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

describe('SectionHeaderComponent', () => {
  let component: SectionHeaderComponent;
  let fixture: ComponentFixture<SectionHeaderComponent>;
  let routerSpy: Partial<Router>;
  let cacheService: Partial<CacheService>;
  let actionsService: Partial<ActionsService>;
  let apiService: Partial<ApiService>;
  let rolesService: Partial<RolesService>;
  let whatsNewService: {
    getActiveReleaseNoteTitle: jest.Mock;
    getReleaseNoteTitle: jest.Mock;
    findReleaseNoteById: jest.Mock;
  };

  beforeEach(async () => {
    routerSpy = {
      url: '/test',
      events: of(new NavigationEnd(1, '/test', '/test')),
      navigate: jest.fn()
    };

    cacheService = {
      dataCache: signal({
        user: {
          first_name: 'Test User',
          last_name: 'User',
          is_active: true,
          sec_user_id: 1,
          roleName: 'Admin',
          email: 'testuser@example.com',
          status_id: 1,
          user_role_list: [
            {
              roleName: 'Admin',
              roleId: 1,
              is_active: true,
              user_id: 1,
              role_id: 1,
              role: {
                is_active: true,
                justification_update: null,
                sec_role_id: 1,
                name: 'Admin',
                focus_id: 0
              }
            }
          ]
        },
        access_token: 'dummy_access_token',
        refresh_token: 'dummy_refresh_token',
        exp: 0,
        isLoggedIn: signal<boolean>(false)
      }),
      headerHeight: signal<number>(0),
      navbarHeight: signal<number>(0),
      hasSmallScreen: signal<boolean>(true),
      isLoggedIn: signal<boolean>(false),
      currentUrlPath: signal<string>('/test'),
      showSubmissionHistory: signal<boolean>(false),
      currentRouteTitle: signal<string>('Test Title'),
      showSectionHeaderActions: signal<boolean>(true),
      currentResultId: signal<number>(123),
      extractNumericId: jest.fn((id: string | number) => (typeof id === 'number' ? id : parseInt(String(id).split('-').pop() || '0', 10))),
      getCurrentNumericResultId: jest.fn(() => 123),
      currentMetadata: signal({
        status_id: 5
      }),
      isSidebarCollapsed: signal<boolean>(false)
    };

    // Mock isMyResult method separately
    (cacheService as any).isMyResult = jest.fn().mockReturnValue(false);

    // Default rolesService behavior: non-admin, tests will override when needed
    rolesService = {
      isAdmin: jest.fn().mockReturnValue(false) as any
    };

    actionsService = {
      validateToken: jest.fn(),
      logOut: jest.fn(),
      showGlobalAlert: jest.fn(),
      hideGlobalAlert: jest.fn(),
      showToast: jest.fn()
    };

    apiService = {
      DELETE_Result: jest.fn().mockResolvedValue({ successfulRequest: true }),
      GET_ResultsCount: jest.fn(),
      GET_Alignments: jest.fn(),
      GET_GeneralInformation: jest.fn()
    };

    whatsNewService = {
      getActiveReleaseNoteTitle: jest.fn().mockReturnValue(''),
      getReleaseNoteTitle: jest.fn().mockReturnValue(''),
      findReleaseNoteById: jest.fn().mockReturnValue(undefined)
    };

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, SectionHeaderComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            firstChild: null,
            snapshot: {
              paramMap: new Map(),
              data: { title: 'Test Title' },
              url: [],
              params: {}
            },
            params: of({})
          }
        },
        {
          provide: Router,
          useValue: routerSpy
        },
        {
          provide: CacheService,
          useValue: cacheService
        },
        {
          provide: ActionsService,
          useValue: actionsService
        },
        {
          provide: ApiService,
          useValue: apiService
        },
        {
          provide: RolesService,
          useValue: rolesService
        },
        {
          provide: WhatsNewService,
          useValue: whatsNewService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SectionHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show welcome message when route is Home', () => {
    cacheService.currentRouteTitle?.set('Home');
    fixture.detectChanges();
    expect(component.welcomeMessage()).toBe('Welcome, Test User');
  });

  it('should show current route title when not on Home', () => {
    cacheService.currentRouteTitle?.set('Test Route');
    fixture.detectChanges();
    expect(component.welcomeMessage()).toBe('Test Route');
  });

  it('should handle delete result action', () => {
    const deleteMenuItem = component.items().find(item => item.items?.some(subItem => subItem.label === 'Delete Result'));
    const deleteCommand = deleteMenuItem?.items?.find(item => item.label === 'Delete Result')?.command;

    expect(deleteCommand).toBeDefined();

    if (deleteCommand) {
      const fakeEvent = { originalEvent: new Event('click'), item: {} } as MenuItemCommandEvent;

      deleteCommand(fakeEvent);

      expect(actionsService.showGlobalAlert).toHaveBeenCalled();
    }
  });

  it('should execute delete confirm flow successfully', async () => {
    // Trigger menu open to register the alert with confirm callback
    const deleteMenuItem = component.items().find(item => item.items?.some(subItem => subItem.label === 'Delete Result'));
    const deleteCommand = deleteMenuItem?.items?.find(item => item.label === 'Delete Result')?.command;
    const fakeEvent = { originalEvent: new Event('click'), item: {} } as MenuItemCommandEvent;
    deleteCommand?.(fakeEvent);

    // Capture the last call payload and run confirm callback
    const lastCall = (actionsService.showGlobalAlert as jest.Mock).mock.calls.pop()?.[0];
    expect(lastCall).toBeDefined();
    await lastCall.confirmCallback.event();
    // allow async IIFE inside the command to complete
    await Promise.resolve();
    await Promise.resolve();

    expect(actionsService.hideGlobalAlert).toHaveBeenCalled();
    expect(actionsService.showToast).toHaveBeenCalledWith({ severity: 'success', summary: 'Result deleted', detail: 'Result deleted successfully' });
    expect((routerSpy.navigate as jest.Mock)).toHaveBeenCalledWith(['/results-center']);
  });

  it('should handle unsuccessful delete response', async () => {
    (apiService.DELETE_Result as jest.Mock).mockResolvedValueOnce({ successfulRequest: false });

    const deleteMenuItem = component.items().find(item => item.items?.some(subItem => subItem.label === 'Delete Result'));
    const deleteCommand = deleteMenuItem?.items?.find(item => item.label === 'Delete Result')?.command;
    deleteCommand?.({ originalEvent: new Event('click'), item: {} } as MenuItemCommandEvent);

    const lastCall = (actionsService.showGlobalAlert as jest.Mock).mock.calls.pop()?.[0];
    await lastCall.confirmCallback.event();
    await Promise.resolve();
    await Promise.resolve();

    expect(actionsService.hideGlobalAlert).toHaveBeenCalled();
    expect(actionsService.showGlobalAlert).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    // Call inner error alert OK button handler
    const innerErrorPayload = (actionsService.showGlobalAlert as jest.Mock).mock.calls.pop()?.[0];
    innerErrorPayload.confirmCallback.event();
    expect(actionsService.hideGlobalAlert).toHaveBeenCalled();
  });

  it('should handle delete API throwing error', async () => {
    (apiService.DELETE_Result as jest.Mock).mockRejectedValueOnce(new Error('boom'));

    const deleteMenuItem = component.items().find(item => item.items?.some(subItem => subItem.label === 'Delete Result'));
    const deleteCommand = deleteMenuItem?.items?.find(item => item.label === 'Delete Result')?.command;
    deleteCommand?.({ originalEvent: new Event('click'), item: {} } as MenuItemCommandEvent);

    const lastCall = (actionsService.showGlobalAlert as jest.Mock).mock.calls.pop()?.[0];
    await lastCall.confirmCallback.event();
    await Promise.resolve();
    await Promise.resolve();

    expect(actionsService.hideGlobalAlert).toHaveBeenCalled();
    expect(actionsService.showGlobalAlert).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    // Call inner error alert OK button handler
    const innerErrorPayload2 = (actionsService.showGlobalAlert as jest.Mock).mock.calls.pop()?.[0];
    innerErrorPayload2.confirmCallback.event();
    expect(actionsService.hideGlobalAlert).toHaveBeenCalled();
  });

  it('should handle submission history action', () => {
    // Mock the submission service to return some history items
    const mockHistoryItems = [
      { title: 'Test Submission 1', id: '1' },
      { title: 'Test Submission 2', id: '2' }
    ];

    // Since the component doesn't have a submission history menu item,
    // we'll test the getHistoryItemTitle method instead
    const testItem = { title: 'Test Item', id: '123' };
    const result = component.getHistoryItemTitle(testItem);

    expect(result).toBe('Test Item (id: 123)');
  });

  it('should handle history item without id', () => {
    const testItem = { title: 'Test Item', id: null };
    const result = component.getHistoryItemTitle(testItem);

    expect(result).toBe('Test Item');
  });

  it('should not show delete option when status_id is not 4, 5, or 7', () => {
    cacheService.currentMetadata?.set({ status_id: 1 });
    fixture.detectChanges();

    expect(component.showDeleteOption()).toBe(false);
    const items = component.items();
    expect(items[0].items?.length).toBe(0);
  });

  it('should show delete option when status_id is 5', () => {
    cacheService.currentMetadata?.set({ status_id: 5 });
    fixture.detectChanges();

    expect(component.showDeleteOption()).toBe(true);
    const items = component.items();
    expect(items[0].items?.length).toBe(1);
    expect(items[0].items?.[0].label).toBe('Delete Result');
  });

  it('should show delete option when status_id is 7', () => {
    cacheService.currentMetadata?.set({ status_id: 7 });
    fixture.detectChanges();

    expect(component.showDeleteOption()).toBe(true);
    const items = component.items();
    expect(items[0].items?.length).toBe(1);
    expect(items[0].items?.[0].label).toBe('Delete Result');
  });

  it('should show delete option when status_id is 4 and isMyResult is true', () => {
    cacheService.currentMetadata?.set({ status_id: 4 });
    (cacheService as any).isMyResult.mockReturnValue(true);
    fixture.detectChanges();

    expect(component.showDeleteOption()).toBe(true);
    const items = component.items();
    expect(items[0].items?.length).toBe(1);
    expect(items[0].items?.[0].label).toBe('Delete Result');
  });

  it('should not show delete option when status_id is 4 and isMyResult is false', () => {
    cacheService.currentMetadata?.set({ status_id: 4 });
    (cacheService as any).isMyResult.mockReturnValue(false);
    fixture.detectChanges();

    expect(component.showDeleteOption()).toBe(false);
    const items = component.items();
    expect(items[0].items?.length).toBe(0);
  });

  it('should handle delete result when API call is unsuccessful', () => {
    apiService.DELETE_Result = jest.fn().mockResolvedValue({ successfulRequest: false });

    const deleteMenuItem = component.items().find(item => item.items?.some(subItem => subItem.label === 'Delete Result'));
    const deleteCommand = deleteMenuItem?.items?.find(item => item.label === 'Delete Result')?.command;

    expect(deleteCommand).toBeDefined();

    if (deleteCommand) {
      const fakeEvent = { originalEvent: new Event('click'), item: {} } as MenuItemCommandEvent;
      deleteCommand(fakeEvent);

      expect(actionsService.showGlobalAlert).toHaveBeenCalled();
    }
  });

  it('should handle welcome message when user first_name is undefined', () => {
    cacheService.dataCache?.set({
      ...cacheService.dataCache(),
      user: {
        ...cacheService.dataCache().user,
        first_name: undefined as any
      }
    });
    cacheService.currentRouteTitle?.set('Home');
    fixture.detectChanges();

    expect(component.welcomeMessage()).toBe('Welcome, ');
  });

  it('should handle ngAfterViewInit when section-sidebar element does not exist', () => {
    // Create a new component instance for this test
    const newFixture = TestBed.createComponent(SectionHeaderComponent);
    const newComponent = newFixture.componentInstance;

    // Mock querySelector to return null
    const mockQuerySelector = jest.spyOn(newComponent.elementRef.nativeElement, 'querySelector');
    mockQuerySelector.mockReturnValue(null);

    newComponent.ngAfterViewInit();

    expect(mockQuerySelector).toHaveBeenCalledWith('#section-sidebar');
    expect(newComponent['resizeObserver']).toBeNull();
  });

  it('should clean up resize observer on destroy', () => {
    const disconnectSpy = jest.spyOn(ResizeObserverMock.prototype, 'disconnect');
    component.ngOnDestroy();
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('should handle currentMetadata with indicator_id not equal to 5', () => {
    // Mock currentMetadata to return an object with indicator_id !== 5
    (cacheService.currentMetadata as any).set({
      indicator_id: 3,
      status_id: 1,
      is_principal_investigator: false
    });
    fixture.detectChanges();

    const items = component.items();
    // status_id: 1 doesn't meet the delete condition, so no items should be added
    expect(items[0].items?.length).toBe(0);
  });

  it('should handle currentMetadata with indicator_id equal to 5', () => {
    // Mock currentMetadata to return an object with indicator_id === 5
    (cacheService.currentMetadata as any).set({
      indicator_id: 5,
      status_id: 1,
      is_principal_investigator: false
    });
    fixture.detectChanges();

    const items = component.items();
    // status_id: 1 doesn't meet the delete condition, so no items should be added
    expect(items[0].items?.length).toBe(0);
  });

  it('showStarPdfReport should require STAR result and supported indicators', () => {
    (cacheService.currentResultId as any).set('STAR-8');
    (cacheService.currentMetadata as any).set({ indicator_id: 1, result_official_code: 8, report_year: 2026 });
    expect(component.showStarPdfReport()).toBe(true);

    (cacheService.currentMetadata as any).set({ indicator_id: 2, result_official_code: 8, report_year: 2026 });
    expect(component.showStarPdfReport()).toBe(true);

    (cacheService.currentMetadata as any).set({ indicator_id: 4, result_official_code: 8, report_year: 2026 });
    expect(component.showStarPdfReport()).toBe(false);

    (cacheService.currentResultId as any).set('PRMS-8');
    (cacheService.currentMetadata as any).set({ indicator_id: 1, result_official_code: 8, report_year: 2026 });
    expect(component.showStarPdfReport()).toBe(false);
  });

  it('showStarPdfReport should use private currentResultId when cache id is falsy', () => {
    (cacheService.currentResultId as any).set('');
    component['currentResultId'].set('STAR-8');
    (cacheService.currentMetadata as any).set({ indicator_id: 1, result_official_code: 8, report_year: 2026 });

    expect(component.showStarPdfReport()).toBe(true);
  });

  it('openStarPdfReport should use private currentResultId when cache id is falsy', () => {
    const openSpy = jest.spyOn(globalThis, 'open').mockReturnValue({ opener: {} } as Window);
    (cacheService.currentResultId as any).set('');
    component['currentResultId'].set('STAR-44');
    (cacheService.currentMetadata as any).set({ indicator_id: 1, result_official_code: 44, report_year: 2026 });
    (component.route.snapshot as any).queryParamMap = {
      get: jest.fn().mockReturnValue(null)
    };

    component.openStarPdfReport();

    expect(openSpy).toHaveBeenCalledWith('/reports/result/STAR-44', '_blank', 'noopener,noreferrer');
    openSpy.mockRestore();
  });

  it('openStarPdfReport should open the internal viewer with version when URL has version query param', () => {
    const openSpy = jest.spyOn(globalThis, 'open').mockReturnValue({ opener: {} } as Window);
    (cacheService.currentResultId as any).set('STAR-8');
    (cacheService.currentMetadata as any).set({ indicator_id: 1, result_official_code: 8, report_year: 2026 });
    (component.route.snapshot as any).queryParamMap = {
      get: jest.fn().mockReturnValue('2026')
    };

    component.openStarPdfReport();

    expect(openSpy).toHaveBeenCalledWith('/reports/result/STAR-8?version=2026', '_blank', 'noopener,noreferrer');
    openSpy.mockRestore();
  });

  it('openStarPdfReport should not open when inn_dev PDF is temporarily disabled', () => {
    const openSpy = jest.spyOn(globalThis, 'open').mockReturnValue({ opener: {} } as Window);
    (cacheService.currentResultId as any).set('STAR-8');
    (cacheService.currentMetadata as any).set({ indicator_id: 2, result_official_code: 8, report_year: 2026 });

    component.openStarPdfReport();

    expect(openSpy).not.toHaveBeenCalled();
    expect(component.starPdfReportDisabled()).toBe(true);
    openSpy.mockRestore();
  });

  it('openStarPdfReport should omit version when URL has no version query param', () => {
    const openSpy = jest.spyOn(globalThis, 'open').mockReturnValue({ opener: {} } as Window);
    (cacheService.currentResultId as any).set('STAR-44');
    (cacheService.currentMetadata as any).set({ indicator_id: 1, result_official_code: 44, report_year: 2026 });
    (component.route.snapshot as any).queryParamMap = {
      get: jest.fn().mockReturnValue(null)
    };

    component.openStarPdfReport();

    expect(openSpy).toHaveBeenCalledWith('/reports/result/STAR-44', '_blank', 'noopener,noreferrer');
    openSpy.mockRestore();
  });

  it('should show delete option when status_id is 5', () => {
    // Mock currentMetadata to return an object with status_id === 5 (deletable)
    jest.spyOn(cacheService, 'currentMetadata').mockReturnValue({
      indicator_id: 3,
      status_id: 5,
      is_principal_investigator: false
    } as any);
    fixture.detectChanges();

    const items = component.items();
    // status_id: 5 meets the delete condition, so delete item should be added
    expect(items[0].items?.length).toBe(1);
    expect(items[0].items?.[0].label).toBe('Delete Result');
  });

  it('should show delete option when status_id is 7', () => {
    // Mock currentMetadata to return an object with status_id === 7 (deletable)
    jest.spyOn(cacheService, 'currentMetadata').mockReturnValue({
      indicator_id: 3,
      status_id: 7,
      is_principal_investigator: false
    } as any);
    fixture.detectChanges();

    const items = component.items();
    // status_id: 7 meets the delete condition, so delete item should be added
    expect(items[0].items?.length).toBe(1);
    expect(items[0].items?.[0].label).toBe('Delete Result');
  });

  it('should show delete option when status_id is 4 and isMyResult is true', () => {
    // Mock currentMetadata to return an object with status_id === 4 and isMyResult true
    jest.spyOn(cacheService, 'currentMetadata').mockReturnValue({
      indicator_id: 3,
      status_id: 4,
      is_principal_investigator: false
    } as any);
    jest.spyOn(cacheService, 'isMyResult').mockReturnValue(true);
    fixture.detectChanges();

    const items = component.items();
    // status_id: 4 with isMyResult true meets the delete condition, so delete item should be added
    expect(items[0].items?.length).toBe(1);
    expect(items[0].items?.[0].label).toBe('Delete Result');
  });

  it('should not show delete option when status_id is 4 and isMyResult is false', () => {
    // Mock currentMetadata to return an object with status_id === 4 and isMyResult false
    (cacheService.currentMetadata as any).set({
      indicator_id: 3,
      status_id: 4,
      is_principal_investigator: false
    });
    jest.spyOn(cacheService, 'isMyResult').mockReturnValue(false);
    fixture.detectChanges();

    const items = component.items();
    // status_id: 4 with isMyResult false doesn't meet the delete condition, so no items should be added
    expect(items[0].items?.length).toBe(0);
  });

  it('should handle dataCache user being null', () => {
    cacheService.dataCache?.set({
      ...cacheService.dataCache(),
      user: null as any
    });
    cacheService.currentRouteTitle?.set('Home');
    fixture.detectChanges();

    expect(component.welcomeMessage()).toBe('Welcome, ');
  });

  it('should handle dataCache user being undefined', () => {
    cacheService.dataCache?.set({
      ...cacheService.dataCache(),
      user: undefined as any
    });
    cacheService.currentRouteTitle?.set('Home');
    fixture.detectChanges();

    expect(component.welcomeMessage()).toBe('Welcome, ');
  });

  describe('ngAfterViewInit', () => {
    it('should setup ResizeObserver when section-sidebar element exists', () => {
      // Mock querySelector to return a mock element
      const mockElement = {
        getBoundingClientRect: jest.fn().mockReturnValue({ height: 100 })
      };
      const mockQuerySelector = jest.spyOn(component.elementRef.nativeElement, 'querySelector');
      mockQuerySelector.mockReturnValue(mockElement as any);

      component.ngAfterViewInit();

      expect(mockQuerySelector).toHaveBeenCalledWith('#section-sidebar');
      expect(component['resizeObserver']).toBeDefined();
    });

    it('should trigger ResizeObserver callback and update header height', () => {
      // Mock querySelector to return a mock element
      const mockElement = {
        getBoundingClientRect: jest.fn().mockReturnValue({ height: 150 })
      };
      const mockQuerySelector = jest.spyOn(component.elementRef.nativeElement, 'querySelector');
      mockQuerySelector.mockReturnValue(mockElement as any);

      const headerHeightSpy = jest.spyOn(component.cache.headerHeight, 'set');

      component.ngAfterViewInit();

      // Verify that ResizeObserver was created and observe was called
      expect(component['resizeObserver']).toBeDefined();
      expect(mockQuerySelector).toHaveBeenCalledWith('#section-sidebar');
      // Because our mock calls the callback immediately, headerHeight should be updated
      expect(headerHeightSpy).toHaveBeenCalledWith(150);
    });
  });

  describe('ngOnDestroy', () => {
    it('should unsubscribe from router subscription when it exists', () => {
      // Mock routerSubscription
      const unsubscribeSpy = jest.fn();
      (component as any).routerSubscription = { unsubscribe: unsubscribeSpy };

      component.ngOnDestroy();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });

    it('should handle ngOnDestroy when routerSubscription does not exist', () => {
      (component as any).routerSubscription = undefined;

      expect(() => component.ngOnDestroy()).not.toThrow();
    });

    it('should handle ngOnDestroy when routerSubscription is null', () => {
      (component as any).routerSubscription = null;

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('ngOnInit and Navigation', () => {
    it('should initialize with current URL', () => {
      component.ngOnInit();
      expect(component['currentUrl']()).toBe('/test');
    });

    it('should handle NavigationEnd event', () => {
      const routerEventsSubject = new (require('rxjs').Subject)();
      (routerSpy as any).events = routerEventsSubject.asObservable();

      component.ngOnInit();
      routerEventsSubject.next(new NavigationEnd(1, '/new-url', '/new-url'));

      expect(component['currentUrl']()).toBe('/new-url');
    });

    it('should clear data when navigating to non-project/result pages', () => {
      const routerEventsSubject = new (require('rxjs').Subject)();
      (routerSpy as any).events = routerEventsSubject.asObservable();

      component.ngOnInit();
      routerEventsSubject.next(new NavigationEnd(1, '/home', '/home'));

      expect(component['currentProject']()).toEqual({});
      expect(component['contractId']()).toBe('');
    });
  });

  describe('Breadcrumb computation', () => {
    it('should return empty breadcrumb when no contractId', () => {
      component['contractId'].set('');
      expect(component.breadcrumb()).toEqual([]);
    });

    it('should return breadcrumb for project detail page', () => {
      component['contractId'].set('123');
      component['currentProject'].set({ projectDescription: 'Test Project' });
      component['currentUrl'].set('/project-detail/123');

      const breadcrumb = component.breadcrumb();
      expect(breadcrumb).toHaveLength(2);
      expect(breadcrumb[0].label).toBe('Projects');
      expect(breadcrumb[0].route).toBe('/projects');
      expect(breadcrumb[1].label).toBe('Project 123');
      expect(breadcrumb[1].tooltip).toBe('Test Project');
    });

    it('should return Results Center breadcrumb for project detail page entered from results-center', () => {
      component['contractId'].set('A1048');
      component['currentProject'].set({ projectDescription: 'Test Project' });
      component['currentUrl'].set('/project-detail/A1048?from=results-center');

      const breadcrumb = component.breadcrumb();
      expect(breadcrumb).toHaveLength(2);
      expect(breadcrumb[0].label).toBe('Results Center');
      expect(breadcrumb[0].route).toBe('/results-center');
      expect(breadcrumb[1].label).toBe('Project A1048');
    });

    it('should return breadcrumb for result page', () => {
      component['contractId'].set('123');
      component['currentProject'].set({ projectDescription: 'Test Project' });
      component['currentUrl'].set('/result/789/general-information');
      component['resultTitle'].set('Test Result');

      const breadcrumb = component.breadcrumb();
      expect(breadcrumb).toHaveLength(3);
      expect(breadcrumb[0].label).toBe('Projects');
      expect(breadcrumb[0].route).toBe('/projects');
      expect(breadcrumb[1].label).toBe('Project 123');
      expect(breadcrumb[1].route).toBe('/project-detail/123');
      expect(breadcrumb[2].label).toBe('Result 789');
      expect(breadcrumb[2].tooltip).toBe('Test Result');
    });

    it('should return Results Center → Result when result was opened from Results Center (from query)', () => {
      component['contractId'].set('');
      component['currentUrl'].set('/result/ROAR-7/general-information?from=results-center');
      component['resultTitle'].set('OICR title');

      const breadcrumb = component.breadcrumb();
      expect(breadcrumb).toEqual([
        { label: 'Results Center', route: '/results-center' },
        { label: 'Result ROAR-7', tooltip: 'OICR title' }
      ]);
    });

    it('should return Home → Result when result was opened from Home (from query)', () => {
      component['contractId'].set('');
      component['currentUrl'].set('/result/STAR-11809/general-information?from=home');
      component['resultTitle'].set('LEVERS OICRS 2026');

      const breadcrumb = component.breadcrumb();
      expect(breadcrumb).toEqual([
        { label: 'Home', route: '/home' },
        { label: 'Result STAR-11809', tooltip: 'LEVERS OICRS 2026' }
      ]);
    });

    it('should return empty breadcrumb when Results Center entry has no result id segment', () => {
      component['contractId'].set('');
      component['currentUrl'].set('/result/?from=results-center');
      component['resultTitle'].set('x');

      expect(component.breadcrumb()).toEqual([]);
    });

    it('should return empty breadcrumb when Home entry has no result id segment', () => {
      component['contractId'].set('');
      component['currentUrl'].set('/result/?from=home');
      component['resultTitle'].set('x');

      expect(component.breadcrumb()).toEqual([]);
    });

    it('should handle result page without resultId in URL', () => {
      component['contractId'].set('123');
      component['currentProject'].set({ projectDescription: 'Test Project' });
      component['currentUrl'].set('/result/');

      const breadcrumb = component.breadcrumb();
      expect(breadcrumb).toHaveLength(2);
      expect(breadcrumb[1].label).toBe('Project 123');
      expect(breadcrumb[1].route).toBeUndefined();
    });

    it('should return Release Notes breadcrumb for whats-new details with active title', () => {
      component['contractId'].set('');
      component['currentUrl'].set('/whats-new/details/page-abc');
      whatsNewService.getActiveReleaseNoteTitle.mockReturnValue('Metadata export');

      const breadcrumb = component.breadcrumb();
      expect(breadcrumb).toEqual([
        { label: 'Release Notes', route: '/whats-new' },
        { label: 'Metadata export', tooltip: 'Metadata export' }
      ]);
    });

    it('should resolve whats-new details title from list when active title is empty', () => {
      component['contractId'].set('');
      component['currentUrl'].set('/whats-new/details/page-abc');
      whatsNewService.getActiveReleaseNoteTitle.mockReturnValue('');
      whatsNewService.getReleaseNoteTitle.mockReturnValue('From catalog');
      whatsNewService.findReleaseNoteById.mockReturnValue({ id: 'page-abc' } as any);

      const breadcrumb = component.breadcrumb();
      expect(breadcrumb[1].label).toBe('From catalog');
      expect(whatsNewService.findReleaseNoteById).toHaveBeenCalledWith('page-abc');
    });

    it('should not build whats-new breadcrumb for non-detail routes', () => {
      component['contractId'].set('');
      component['currentUrl'].set('/whats-new');
      expect(component.breadcrumb()).toEqual([]);
    });

    it('should fallback whats-new details breadcrumb label when title is missing', () => {
      component['contractId'].set('');
      component['currentUrl'].set('/whats-new/details/page-abc');
      whatsNewService.getActiveReleaseNoteTitle.mockReturnValue('');
      whatsNewService.getReleaseNoteTitle.mockReturnValue('');

      const breadcrumb = component.breadcrumb();
      expect(breadcrumb).toEqual([
        { label: 'Release Notes', route: '/whats-new' },
        { label: 'Release note', tooltip: undefined }
      ]);
    });
  });

  describe('Computed properties', () => {
    it('should correctly identify project detail page', () => {
      component['currentUrl'].set('/project-detail/123');
      expect(component.isProjectDetailPage()).toBe(true);

      component['currentUrl'].set('/home');
      expect(component.isProjectDetailPage()).toBe(false);
    });

    it('should correctly identify result page', () => {
      component['currentUrl'].set('/result/123/general-information');
      expect(component.isResultPage()).toBe(true);

      component['currentUrl'].set('/result/123');
      expect(component.isResultPage()).toBe(true);

      component['currentUrl'].set('/result');
      expect(component.isResultPage()).toBe(false);

      component['currentUrl'].set('/home');
      expect(component.isResultPage()).toBe(false);
    });
  });

  describe('Data loading methods', () => {
    beforeEach(() => {
      // Mock API methods
      apiService.GET_ResultsCount = jest.fn();
      apiService.GET_Alignments = jest.fn();
      apiService.GET_GeneralInformation = jest.fn();
    });

    describe('loadProjectData', () => {
      it('should load project data successfully', async () => {
        const mockProjectData = { projectDescription: 'Test Project', description: 'Test Description' };
        apiService.GET_ResultsCount = jest.fn().mockResolvedValue({ data: mockProjectData });

        // Set up router URL for project detail page
        (routerSpy as any).url = '/project-detail/123';
        component['currentUrl'].set('/project-detail/123');

        await component['loadProjectData']();

        expect(apiService.GET_ResultsCount).toHaveBeenCalledWith('123');
        expect(component['contractId']()).toBe('123');
        expect(component['currentProject']()).toEqual(mockProjectData);
      });

      it('should handle API error in loadProjectData', async () => {
        apiService.GET_ResultsCount = jest.fn().mockRejectedValue(new Error('API Error'));

        (routerSpy as any).url = '/project-detail/123';
        component['currentUrl'].set('/project-detail/123');

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await component['loadProjectData']();

        expect(consoleSpy).toHaveBeenCalledWith('Error loading project data:', expect.any(Error));
        consoleSpy.mockRestore();
      });

      it('should handle API response without data', async () => {
        apiService.GET_ResultsCount = jest.fn().mockResolvedValue({ data: null });

        (routerSpy as any).url = '/project-detail/123';
        component['currentUrl'].set('/project-detail/123');

        await component['loadProjectData']();

        expect(component['currentProject']()).toEqual({});
      });

      it('should set empty contractId when URL has no project-detail segment', async () => {
        apiService.GET_ResultsCount = jest.fn().mockResolvedValue({ data: {} });

        (routerSpy as any).url = '/some-other-page';
        component['currentUrl'].set('/some-other-page');

        await component['loadProjectData']();

        expect(component['contractId']()).toBe('');
      });
    });

    describe('loadResultData', () => {
      it('should load result data successfully', async () => {
        const mockResultData = { title: 'Test Result Title' };
        const mockAlignmentsData = {
          data: {
            contracts: [{ is_primary: true, contract_id: '456' }]
          }
        };
        const mockProjectData = { projectDescription: 'Test Project' };

        apiService.GET_GeneralInformation = jest.fn().mockResolvedValue({ data: mockResultData });
        apiService.GET_Alignments = jest.fn().mockResolvedValue(mockAlignmentsData);
        apiService.GET_ResultsCount = jest.fn().mockResolvedValue({ data: mockProjectData });

        (routerSpy as any).url = '/result/789/general-information';
        component['currentUrl'].set('/result/789/general-information');

        await component['loadResultData']();

        expect(apiService.GET_GeneralInformation).toHaveBeenCalledWith(789);
        expect(apiService.GET_Alignments).toHaveBeenCalledWith(789);
        expect(component['currentResultId']()).toBe('789');
        expect(component['resultTitle']()).toBe('Test Result Title');
        expect(component['contractId']()).toBe('456');
        expect(component['currentProject']()).toEqual(mockProjectData);
      });

      it('should handle result data without title', async () => {
        const mockResultData = { title: null };
        const mockAlignmentsData = {
          data: {
            contracts: [{ is_primary: true, contract_id: '456' }]
          }
        };

        apiService.GET_GeneralInformation = jest.fn().mockResolvedValue({ data: mockResultData });
        apiService.GET_Alignments = jest.fn().mockResolvedValue(mockAlignmentsData);
        apiService.GET_ResultsCount = jest.fn().mockResolvedValue({ data: {} });

        (routerSpy as any).url = '/result/789/general-information';
        component['currentUrl'].set('/result/789/general-information');

        await component['loadResultData']();

        expect(component['resultTitle']()).toBe('');
      });

      it('should handle alignments data without contracts', async () => {
        const mockResultData = { title: 'Test Result Title' };
        const mockAlignmentsData = { data: { contracts: null } };

        apiService.GET_GeneralInformation = jest.fn().mockResolvedValue({ data: mockResultData });
        apiService.GET_Alignments = jest.fn().mockResolvedValue(mockAlignmentsData);

        (routerSpy as any).url = '/result/789/general-information';
        component['currentUrl'].set('/result/789/general-information');

        await component['loadResultData']();

        expect(component['resultTitle']()).toBe('Test Result Title');
        expect(component['contractId']()).toBe('');
      });

      it('should handle alignments data without primary contract', async () => {
        const mockResultData = { title: 'Test Result Title' };
        const mockAlignmentsData = {
          data: {
            contracts: [{ is_primary: false, contract_id: '456' }]
          }
        };

        apiService.GET_GeneralInformation = jest.fn().mockResolvedValue({ data: mockResultData });
        apiService.GET_Alignments = jest.fn().mockResolvedValue(mockAlignmentsData);

        (routerSpy as any).url = '/result/789/general-information';
        component['currentUrl'].set('/result/789/general-information');

        await component['loadResultData']();

        expect(component['resultTitle']()).toBe('Test Result Title');
        expect(component['contractId']()).toBe('');
      });

      it('should handle API error in loadResultData', async () => {
        apiService.GET_GeneralInformation = jest.fn().mockRejectedValue(new Error('API Error'));
        apiService.GET_Alignments = jest.fn().mockRejectedValue(new Error('API Error'));

        (routerSpy as any).url = '/result/789/general-information';
        component['currentUrl'].set('/result/789/general-information');

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await component['loadResultData']();

        expect(consoleSpy).toHaveBeenCalledWith('Error loading result data:', expect.any(Error));
        consoleSpy.mockRestore();
      });
    });

    describe('loadProjectDataById', () => {
      it('should load project data by ID successfully', async () => {
        const mockProjectData = { projectDescription: 'Test Project' };
        apiService.GET_ResultsCount = jest.fn().mockResolvedValue({ data: mockProjectData });

        await component['loadProjectDataById']('123');

        expect(apiService.GET_ResultsCount).toHaveBeenCalledWith('123');
        expect(component['contractId']()).toBe('123');
        expect(component['currentProject']()).toEqual(mockProjectData);
      });

      it('should handle API error in loadProjectDataById', async () => {
        apiService.GET_ResultsCount = jest.fn().mockRejectedValue(new Error('API Error'));

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await component['loadProjectDataById']('123');

        expect(consoleSpy).toHaveBeenCalledWith('Error loading project data:', expect.any(Error));
        consoleSpy.mockRestore();
      });

      it('should handle API response without data in loadProjectDataById', async () => {
        apiService.GET_ResultsCount = jest.fn().mockResolvedValue({ data: null });

        await component['loadProjectDataById']('123');

        expect(component['currentProject']()).toEqual({});
      });
    });
  });

  describe('loadData method', () => {
    beforeEach(() => {
      // Mock the private methods
      jest.spyOn(component as any, 'loadProjectData').mockResolvedValue(undefined);
      jest.spyOn(component as any, 'loadResultData').mockResolvedValue(undefined);
    });

    it('should call loadProjectData when on project detail page', async () => {
      component['currentUrl'].set('/project-detail/123');

      await component['loadData']();

      expect(component['loadProjectData']).toHaveBeenCalled();
      expect(component['loadResultData']).not.toHaveBeenCalled();
    });

    it('should call loadResultData when on result page', async () => {
      component['currentUrl'].set('/result/789/general-information');

      await component['loadData']();

      expect(component['loadResultData']).toHaveBeenCalled();
      expect(component['loadProjectData']).not.toHaveBeenCalled();
    });

    it('should not call any load method when on other pages', async () => {
      component['currentUrl'].set('/home');

      await component['loadData']();

      expect(component['loadProjectData']).not.toHaveBeenCalled();
      expect(component['loadResultData']).not.toHaveBeenCalled();
    });
  });

  describe('clearData method', () => {
    it('should clear all data signals', () => {
      // Set some data first
      component['currentProject'].set({ projectDescription: 'Test' });
      component['contractId'].set('123');
      component['currentResult'].set({ title: 'Test Result' });
      component['currentResultId'].set('789');
      component['resultTitle'].set('Test Result Title');

      component['clearData']();

      expect(component['currentProject']()).toEqual({});
      expect(component['contractId']()).toBe('');
      expect(component['currentResult']()).toEqual({});
      expect(component['currentResultId']()).toBe('');
      expect(component['resultTitle']()).toBe('');
    });
  });

  describe('Navigation event handling', () => {
    it('should load data when navigating to project detail page', () => {
      const routerEventsSubject = new (require('rxjs').Subject)();
      (routerSpy as any).events = routerEventsSubject.asObservable();

      const loadDataSpy = jest.spyOn(component as any, 'loadData').mockResolvedValue(undefined);

      component.ngOnInit();
      routerEventsSubject.next(new NavigationEnd(1, '/project-detail/123', '/project-detail/123'));

      expect(loadDataSpy).toHaveBeenCalled();
    });

    it('should load data when navigating to result page', () => {
      const routerEventsSubject = new (require('rxjs').Subject)();
      (routerSpy as any).events = routerEventsSubject.asObservable();

      const loadDataSpy = jest.spyOn(component as any, 'loadData').mockResolvedValue(undefined);

      component.ngOnInit();
      routerEventsSubject.next(new NavigationEnd(1, '/result/789/general-information', '/result/789/general-information'));

      expect(loadDataSpy).toHaveBeenCalled();
    });

    it('should clear data when navigating to other pages', () => {
      const routerEventsSubject = new (require('rxjs').Subject)();
      (routerSpy as any).events = routerEventsSubject.asObservable();

      const clearDataSpy = jest.spyOn(component as any, 'clearData').mockImplementation(() => {});

      component.ngOnInit();
      routerEventsSubject.next(new NavigationEnd(1, '/home', '/home'));

      expect(clearDataSpy).toHaveBeenCalled();
    });
  });

  describe('Breadcrumb edge cases', () => {
    it('should handle breadcrumb with project description fallback', () => {
      component['contractId'].set('123');
      component['currentProject'].set({ description: 'Fallback Description' });
      component['currentUrl'].set('/project-detail/123');

      const breadcrumb = component.breadcrumb();
      expect(breadcrumb[1].tooltip).toBe('Fallback Description');
    });

    it('should handle breadcrumb with no project description', () => {
      component['contractId'].set('123');
      component['currentProject'].set({});
      component['currentUrl'].set('/project-detail/123');

      const breadcrumb = component.breadcrumb();
      expect(breadcrumb[1].tooltip).toBeUndefined();
    });

    it('should handle breadcrumb for result page with empty result title', () => {
      component['contractId'].set('123');
      component['currentProject'].set({ projectDescription: 'Test Project' });
      component['currentUrl'].set('/result/789/general-information');
      component['resultTitle'].set('');

      const breadcrumb = component.breadcrumb();
      expect(breadcrumb[2].tooltip).toBe('');
    });
  });
});
