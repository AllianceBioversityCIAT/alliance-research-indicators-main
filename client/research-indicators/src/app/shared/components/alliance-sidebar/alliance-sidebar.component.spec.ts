import { ChangeDetectorRef, Renderer2 } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, NavigationEnd, Router, UrlTree, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AllianceSidebarComponent } from './alliance-sidebar.component';
import { AdministrationNavGroup } from '@interfaces/administration-nav.interface';
import { CacheService } from '@services/cache/cache.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { RolesService } from '@services/cache/roles.service';
import { ActionsService } from '@services/actions.service';

describe('AllianceSidebarComponent', () => {
  let component: AllianceSidebarComponent;
  let fixture: ComponentFixture<AllianceSidebarComponent>;

  beforeEach(async () => {
    const mockCacheService = {
      hasSmallScreen: jest.fn().mockReturnValue(false),
      isSidebarCollapsed: jest.fn().mockReturnValue(false),
      toggleSidebar: jest.fn()
    } as unknown as CacheService;
    const mockAllModalsService = {
      openModal: jest.fn()
    } as unknown as AllModalsService;
    const mockRolesService = {
      canAccessCenterAdmin: jest.fn().mockReturnValue(false),
      canAccessAppConfiguration: jest.fn().mockReturnValue(false)
    } as unknown as RolesService;
    const mockActionsService = {
      logOut: jest.fn()
    } as unknown as ActionsService;
    await TestBed.configureTestingModule({
      imports: [AllianceSidebarComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: new Map() },
            params: of({})
          }
        },
        { provide: CacheService, useValue: mockCacheService },
        { provide: AllModalsService, useValue: mockAllModalsService },
        { provide: RolesService, useValue: mockRolesService },
        { provide: ActionsService, useValue: mockActionsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AllianceSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should include Bilateral Mapping in center-admin children when user can access center admin', () => {
    const roles = TestBed.inject(RolesService) as unknown as { canAccessCenterAdmin: jest.Mock };
    roles.canAccessCenterAdmin.mockReturnValue(true);
    const centerAdmin = component.administrationGroups().find(g => g.id === 'center-admin');
    expect(centerAdmin).toBeTruthy();
    const bilateral = centerAdmin?.children.find(c => c.link === '/administration/center-admin/bilateral-mapping');
    expect(bilateral).toEqual({
      label: 'Bilateral Mapping',
      link: '/administration/center-admin/bilateral-mapping',
      icon: 'pi-sitemap',
      iconSize: '13px'
    });
  });

  it('should hide center-admin group when user cannot access center admin', () => {
    const roles = TestBed.inject(RolesService) as unknown as { canAccessCenterAdmin: jest.Mock };
    roles.canAccessCenterAdmin.mockReturnValue(false);
    const centerAdmin = component.administrationGroups().find(g => g.id === 'center-admin');
    expect(centerAdmin).toBeUndefined();
  });

  it('should set innerWidth and collapse sidebar on small screen when not collapsed', () => {
    const cache = TestBed.inject(CacheService) as any;
    cache.hasSmallScreen.mockReturnValue(true);
    cache.isSidebarCollapsed.mockReturnValue(false);
    component.ngOnInit();
    expect(component.innerWidth).toBe(globalThis.innerWidth);
    expect(cache.toggleSidebar).toHaveBeenCalled();
  });

  it('should not collapse sidebar if already collapsed', () => {
    const cache = TestBed.inject(CacheService) as any;
    cache.hasSmallScreen.mockReturnValue(true);
    cache.isSidebarCollapsed.mockReturnValue(true);
    (cache.toggleSidebar as jest.Mock).mockClear();
    component.ngOnInit();
    expect(cache.toggleSidebar).not.toHaveBeenCalled();
  });

  it('should not toggle on large screen when hasSmallScreen is false', () => {
    const cache = TestBed.inject(CacheService) as any;
    const originalWidth = globalThis.innerWidth;
    Object.defineProperty(globalThis, 'innerWidth', { value: 1600, configurable: true });
    cache.hasSmallScreen.mockReturnValue(false);
    cache.isSidebarCollapsed.mockReturnValue(false);
    (cache.toggleSidebar as jest.Mock).mockClear();
    component.ngOnInit();
    expect(cache.toggleSidebar).not.toHaveBeenCalled();
    Object.defineProperty(globalThis, 'innerWidth', { value: originalWidth, configurable: true });
  });

  it('should open ask for help modal via account options action', () => {
    const modals = TestBed.inject(AllModalsService) as any;
    const action = component.accountOptions.find(o => !!o.action && o.label === 'Ask for Help')!.action as Function;
    action();
    expect(modals.openModal).toHaveBeenCalledWith('askForHelp');
  });

  it('should toggle sidebar and dispatch resize on toggleSidebarAndResize', fakeAsync(() => {
    const cache = TestBed.inject(CacheService) as any;
    const dispatchSpy = jest.spyOn(globalThis, 'dispatchEvent');
    component.administrationFlyoutGroupId.set('center-admin');
    component.toggleSidebarAndResize();
    expect(component.administrationFlyoutGroupId()).toBeNull();
    expect(cache.toggleSidebar).toHaveBeenCalled();
    tick(150);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(Event));
    dispatchSpy.mockRestore();
  }));

  it('should call logOut when log out account action runs', () => {
    const actions = TestBed.inject(ActionsService) as any;
    const logOutOption = component.accountOptions.find(o => o.logout);
    expect(logOutOption).toBeDefined();
    (logOutOption!.action as () => void)();
    expect(actions.logOut).toHaveBeenCalled();
  });

  it('should toggle administration group expansion state', () => {
    expect(component.isAdministrationGroupExpanded('center-admin')).toBe(true);
    component.toggleAdministrationGroup('center-admin');
    expect(component.isAdministrationGroupExpanded('center-admin')).toBe(false);
    component.toggleAdministrationGroup('center-admin');
    expect(component.isAdministrationGroupExpanded('center-admin')).toBe(true);
  });

  it('should default administration groups expanded when sidebar is open, collapsed when sidebar is narrow', () => {
    expect(component.isAdministrationGroupExpanded('unknown-id')).toBe(true);
    const cache = TestBed.inject(CacheService) as any;
    cache.isSidebarCollapsed.mockReturnValue(true);
    expect(component.isAdministrationGroupExpanded('unknown-id')).toBe(false);
    component.toggleAdministrationGroup('unknown-id');
    expect(component.isAdministrationGroupExpanded('unknown-id')).toBe(true);
  });

  it('should filter hidden children in visibleAdministrationChildren', () => {
    const group: AdministrationNavGroup = {
      id: 'g',
      label: 'G',
      icon: 'pi-test',
      children: [
        { label: 'Hidden', link: '/h', icon: 'pi-x', hide: true },
        { label: 'Visible', link: '/v', icon: 'pi-check' }
      ]
    };
    const visible = component.visibleAdministrationChildren(group);
    expect(visible).toHaveLength(1);
    expect(visible[0].label).toBe('Visible');
  });

  it('should include portfolio management in center admin navigation', () => {
    const roles = TestBed.inject(RolesService) as { canAccessCenterAdmin: jest.Mock };
    roles.canAccessCenterAdmin.mockReturnValue(true);

    const centerAdmin = component.administrationGroups().find(group => group.id === 'center-admin');

    expect(centerAdmin?.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Portfolio Management',
          link: '/administration/center-admin/portfolio-management'
        })
      ])
    );
  });

  it('should clear flyout id when closeAdministrationFlyout is called', () => {
    component.administrationFlyoutGroupId.set('center-admin');
    const cdr = (component as unknown as { cdr: ChangeDetectorRef }).cdr;
    const spy = jest.spyOn(cdr, 'markForCheck');
    component.closeAdministrationFlyout();
    expect(component.administrationFlyoutGroupId()).toBeNull();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should not call stopPropagation on toggleAdministrationFlyout when sidebar is expanded', () => {
    const cache = TestBed.inject(CacheService) as { isSidebarCollapsed: jest.Mock };
    cache.isSidebarCollapsed.mockReturnValue(false);
    component.administrationFlyoutGroupId.set('center-admin');
    const stopPropagation = jest.fn();
    component.toggleAdministrationFlyout('center-admin', { stopPropagation } as unknown as Event);
    expect(stopPropagation).not.toHaveBeenCalled();
    expect(component.administrationFlyoutGroupId()).toBe('center-admin');
  });

  it('should toggle administration flyout and stopPropagation when sidebar is collapsed', () => {
    const cache = TestBed.inject(CacheService) as { isSidebarCollapsed: jest.Mock };
    cache.isSidebarCollapsed.mockReturnValue(true);
    const stop1 = jest.fn();
    component.toggleAdministrationFlyout('center-admin', { stopPropagation: stop1 } as unknown as Event);
    expect(stop1).toHaveBeenCalled();
    expect(component.administrationFlyoutGroupId()).toBe('center-admin');
    const stop2 = jest.fn();
    component.toggleAdministrationFlyout('center-admin', { stopPropagation: stop2 } as unknown as Event);
    expect(stop2).toHaveBeenCalled();
    expect(component.administrationFlyoutGroupId()).toBeNull();
  });

  it('should switch flyout to a different group when another group id is toggled while open', () => {
    const cache = TestBed.inject(CacheService) as { isSidebarCollapsed: jest.Mock };
    const roles = TestBed.inject(RolesService) as {
      canAccessCenterAdmin: jest.Mock;
      canAccessAppConfiguration: jest.Mock;
    };
    cache.isSidebarCollapsed.mockReturnValue(true);
    roles.canAccessCenterAdmin.mockReturnValue(true);
    roles.canAccessAppConfiguration.mockReturnValue(true);
    component.administrationFlyoutGroupId.set('center-admin');
    const ev = { stopPropagation: jest.fn() } as unknown as Event;
    component.toggleAdministrationFlyout('system-admin', ev);
    expect(ev.stopPropagation).toHaveBeenCalled();
    expect(component.administrationFlyoutGroupId()).toBe('system-admin');
  });

  it('should render system admin s3 group icon in collapsed sidebar', () => {
    const cache = TestBed.inject(CacheService) as { isSidebarCollapsed: jest.Mock };
    const roles = TestBed.inject(RolesService) as {
      canAccessCenterAdmin: jest.Mock;
      canAccessAppConfiguration: jest.Mock;
    };
    cache.isSidebarCollapsed.mockReturnValue(true);
    roles.canAccessCenterAdmin.mockReturnValue(false);
    roles.canAccessAppConfiguration.mockReturnValue(true);
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();

    const group = component.administrationGroups().find(g => g.id === 'system-admin');
    expect(group?.s3Image).toBe('icons/graph.svg');

    const button = fixture.nativeElement.querySelector(
      'button.admin-parent--collapsed'
    ) as HTMLButtonElement | null;
    const img = button?.querySelector('img') as HTMLImageElement | null;
    expect(img).toBeTruthy();
    expect(img?.style.width).toBe(group?.iconSize);
    expect(img?.style.height).toBe(group?.iconSize);
    expect(img?.getAttribute('src')).toContain('icons/graph.svg');
  });
});

describe('AllianceSidebarComponent coverage (document listener + destroy)', () => {
  let fixture: ComponentFixture<AllianceSidebarComponent>;
  let component: AllianceSidebarComponent;
  let docClickHandler: (e: Event) => void;
  let mockUnlisten: jest.Mock;
  let routerEventsSubject: Subject<unknown>;
  let mockCache: {
    hasSmallScreen: jest.Mock;
    isSidebarCollapsed: jest.Mock;
    toggleSidebar: jest.Mock;
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    mockUnlisten = jest.fn();
    routerEventsSubject = new Subject<unknown>();
    mockCache = {
      hasSmallScreen: jest.fn().mockReturnValue(false),
      isSidebarCollapsed: jest.fn().mockReturnValue(true),
      toggleSidebar: jest.fn()
    };
    const routerMock = {
      events: routerEventsSubject.asObservable(),
      url: '/',
      navigateByUrl: jest.fn().mockResolvedValue(true),
      navigate: jest.fn().mockResolvedValue(true),
      createUrlTree: jest.fn().mockReturnValue({} as UrlTree),
      serializeUrl: jest.fn().mockReturnValue(''),
      parseUrl: jest.fn(),
      isActive: jest.fn().mockReturnValue(false),
      routerState: { snapshot: { url: '/', root: {} } }
    } as unknown as Router;
    await TestBed.configureTestingModule({
      imports: [AllianceSidebarComponent],
      providers: [
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: new Map() },
            params: of({})
          }
        },
        { provide: CacheService, useValue: mockCache },
        { provide: AllModalsService, useValue: { openModal: jest.fn() } },
        {
          provide: RolesService,
          useValue: {
            canAccessCenterAdmin: jest.fn().mockReturnValue(true),
            canAccessAppConfiguration: jest.fn().mockReturnValue(false)
          }
        },
        { provide: ActionsService, useValue: { logOut: jest.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AllianceSidebarComponent);
    component = fixture.componentInstance;

    const renderer = fixture.debugElement.injector.get(Renderer2);
    const origListen = renderer.listen.bind(renderer);
    jest.spyOn(renderer, 'listen').mockImplementation((target: unknown, event: string, callback: (e: Event) => void) => {
      if (target === 'document' && event === 'click') {
        docClickHandler = callback;
        return mockUnlisten;
      }
      return origListen(target as never, event, callback);
    });

    fixture.detectChanges();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should invoke markForCheck on NavigationEnd from router subscription', () => {
    const cdr = (component as unknown as { cdr: ChangeDetectorRef }).cdr;
    const spy = jest.spyOn(cdr, 'markForCheck');
    spy.mockClear();
    routerEventsSubject.next(new NavigationEnd(1, '/cov-a', '/cov-a'));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('document click handler returns early when no flyout is open', () => {
    const spy = jest.spyOn(fixture.debugElement.injector.get(ChangeDetectorRef), 'markForCheck');
    component.administrationFlyoutGroupId.set(null);
    docClickHandler(new MouseEvent('click', { bubbles: true }));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('document click handler returns early when sidebar is not collapsed', () => {
    mockCache.isSidebarCollapsed.mockReturnValue(false);
    const spy = jest.spyOn(fixture.debugElement.injector.get(ChangeDetectorRef), 'markForCheck');
    spy.mockClear();
    component.administrationFlyoutGroupId.set('center-admin');
    docClickHandler(new MouseEvent('click', { bubbles: true }));
    expect(component.administrationFlyoutGroupId()).toBe('center-admin');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('document click handler returns early when event target is null', () => {
    const spy = jest.spyOn(fixture.debugElement.injector.get(ChangeDetectorRef), 'markForCheck');
    spy.mockClear();
    component.administrationFlyoutGroupId.set('center-admin');
    mockCache.isSidebarCollapsed.mockReturnValue(true);
    docClickHandler({ target: null } as unknown as Event);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('document click handler does not close flyout when click is inside panel', () => {
    component.administrationFlyoutGroupId.set('center-admin');
    fixture.detectChanges();
    const flyout = fixture.nativeElement.querySelector('.admin-center-admin-flyout') as HTMLElement;
    expect(flyout).toBeTruthy();
    const inner = flyout.querySelector('.admin-flyout-header') as HTMLElement;
    const ev = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(ev, 'target', { value: inner, enumerable: true });
    docClickHandler(ev);
    expect(component.administrationFlyoutGroupId()).toBe('center-admin');
  });

  it('document click handler does not close flyout when click is inside collapsed trigger', () => {
    component.administrationFlyoutGroupId.set('center-admin');
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('button.admin-parent--collapsed') as HTMLElement;
    expect(trigger).toBeTruthy();
    const ev = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(ev, 'target', { value: trigger, enumerable: true });
    docClickHandler(ev);
    expect(component.administrationFlyoutGroupId()).toBe('center-admin');
  });

  it('document click handler closes flyout when click is outside panel and triggers', () => {
    component.administrationFlyoutGroupId.set('center-admin');
    fixture.detectChanges();
    const cdr = (component as unknown as { cdr: ChangeDetectorRef }).cdr;
    const spy = jest.spyOn(cdr, 'markForCheck');
    spy.mockClear();
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    const ev = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(ev, 'target', { value: outside, enumerable: true });
    docClickHandler(ev);
    expect(component.administrationFlyoutGroupId()).toBeNull();
    expect(spy).toHaveBeenCalled();
    outside.remove();
    spy.mockRestore();
  });

  it('document click handler closes flyout when panel element is missing from DOM', () => {
    component.administrationFlyoutGroupId.set('center-admin');
    mockCache.isSidebarCollapsed.mockReturnValue(true);
    const qsSpy = jest.spyOn(fixture.nativeElement, 'querySelector').mockReturnValue(null as unknown as Element);
    const qsaSpy = jest
      .spyOn(fixture.nativeElement, 'querySelectorAll')
      .mockReturnValue([] as unknown as NodeListOf<Element>);
    const cdr = (component as unknown as { cdr: ChangeDetectorRef }).cdr;
    const spy = jest.spyOn(cdr, 'markForCheck');
    spy.mockClear();
    const outside = document.createElement('div');
    const ev = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(ev, 'target', { value: outside, enumerable: true });
    docClickHandler(ev);
    expect(component.administrationFlyoutGroupId()).toBeNull();
    expect(spy).toHaveBeenCalled();
    qsSpy.mockRestore();
    qsaSpy.mockRestore();
    spy.mockRestore();
  });

  it('ngOnDestroy should call document unlisten and router subscription unsubscribe', () => {
    const sub = (component as unknown as { routerEventsSub: { unsubscribe: jest.Mock } }).routerEventsSub;
    const unsubSpy = jest.spyOn(sub, 'unsubscribe');
    fixture.destroy();
    expect(mockUnlisten).toHaveBeenCalled();
    expect(unsubSpy).toHaveBeenCalled();
  });
});
