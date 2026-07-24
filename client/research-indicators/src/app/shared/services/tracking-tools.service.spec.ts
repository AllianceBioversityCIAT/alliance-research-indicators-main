import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { of } from 'rxjs';

import { TrackingToolsService } from './tracking-tools.service';

// Mock location.reload
Object.defineProperty(window, 'location', {
  value: {
    reload: jest.fn()
  },
  writable: true
});

const cacheMock = {
  currentUrlPath: { set: jest.fn() },
  showSectionHeaderActions: { set: jest.fn() },
  currentRouteTitle: { set: jest.fn() },
  hasSmallScreen: jest.fn().mockReturnValue(false),
  collapseSidebar: jest.fn()
};
const clarityMock = { init: jest.fn(), updateState: jest.fn() };
const hotjarMock = { init: jest.fn(), updateState: jest.fn() };
const bugherdMock = { init: jest.fn() };
const googleAnalyticsMock = { init: jest.fn(), updateState: jest.fn() };

function createRouteMock(data: any = {}, children: any[] = []) {
  return {
    snapshot: { data },
    firstChild: children[0] || null,
    ...(children.length > 0 && { firstChild: children[0] })
  };
}

function createService({
  cache = cacheMock,
  clarity = clarityMock,
  hotjar = hotjarMock,
  bugherd = bugherdMock,
  googleAnalytics = googleAnalyticsMock,
  route = createRouteMock(),
  routerEvents = [] as any[]
} = {}) {
  // @ts-ignore
  const service = Object.create(TrackingToolsService.prototype);
  service.cache = cache;
  service.clarity = clarity;
  service.hotjar = hotjar;
  service.bugherd = bugherd;
  service.googleAnalytics = googleAnalytics;
  service.route = route;
  service.router = { events: { pipe: jest.fn(() => ({ subscribe: jest.fn(fn => routerEvents.forEach(fn)) })) } };
  return service as unknown as TrackingToolsService;
}

describe('TrackingToolsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (window.location.reload as jest.Mock).mockClear();
  });

  it('should be created', () => {
    const service = createService();
    expect(service).toBeTruthy();
  });

  it('should assign all injected dependencies in constructor', () => {
    const service = createService();
    expect(service.cache).toBeDefined();
    expect(service.clarity).toBeDefined();
    expect(service.hotjar).toBeDefined();
    expect(service.bugherd).toBeDefined();
    expect(service.googleAnalytics).toBeDefined();
    expect(service.route).toBeDefined();
    expect(service['router']).toBeDefined();
  });

  it('init calls initAllTools and subscribes to navigation events', async () => {
    const url = '/test';
    const navEvent = { urlAfterRedirects: url, constructor: { name: 'NavigationEnd' } } as any;
    const cache = { ...cacheMock, hasSmallScreen: jest.fn().mockReturnValue(true), collapseSidebar: jest.fn() };
    const service = createService({ cache, routerEvents: [navEvent] });
    jest.spyOn(service, 'initAllTools');
    jest.spyOn(service, 'updateAllTools');
    await service.init();
    expect(service.initAllTools).toHaveBeenCalled();
    expect(cache.currentUrlPath.set).toHaveBeenCalledWith(url);
    expect(service.updateAllTools).toHaveBeenCalledWith(url);
    expect(cache.collapseSidebar).toHaveBeenCalled();
    expect(cache.currentRouteTitle.set).toHaveBeenCalled();
  });

  it('init works without navigation events', async () => {
    const service = createService({ routerEvents: [] });
    jest.spyOn(service, 'initAllTools');
    await service.init();
    expect(service.initAllTools).toHaveBeenCalled();
  });

  it('getCurrentTitle navigates children and sets showSectionHeaderActions and currentRouteTitle', () => {
    const child = createRouteMock({ title: 'Child', showSectionHeaderActions: true });
    const route = createRouteMock({}, [child]);
    const cache = { ...cacheMock, showSectionHeaderActions: { set: jest.fn() }, currentRouteTitle: { set: jest.fn() } };
    const service = createService({ cache, route });
    // @ts-ignore
    service['getCurrentTitle']();
    expect(cache.showSectionHeaderActions.set).toHaveBeenCalledWith(true);
    expect(cache.currentRouteTitle.set).toHaveBeenCalledWith('Child');
  });

  it('getCurrentTitle works without children and sets base title', () => {
    const route = createRouteMock({ title: 'Base Title' });
    const cache = { ...cacheMock, showSectionHeaderActions: { set: jest.fn() }, currentRouteTitle: { set: jest.fn() } };
    const service = createService({ cache, route });
    // @ts-ignore
    service['getCurrentTitle']();
    expect(cache.showSectionHeaderActions.set).toHaveBeenCalledWith(false);
    expect(cache.currentRouteTitle.set).toHaveBeenCalledWith('Base Title');
  });

  it('getCurrentTitle works with null title', () => {
    const route = createRouteMock({ title: null });
    const cache = { ...cacheMock, showSectionHeaderActions: { set: jest.fn() }, currentRouteTitle: { set: jest.fn() } };
    const service = createService({ cache, route });
    // @ts-ignore
    service['getCurrentTitle']();
    expect(cache.showSectionHeaderActions.set).toHaveBeenCalledWith(false);
    expect(cache.currentRouteTitle.set).toHaveBeenCalledWith('');
  });

  it('isTester returns true if localStorage has isTester', () => {
    localStorage.setItem('isTester', 'true');
    const service = createService();
    expect(service.isTester()).toBe(true);
  });

  it('isTester returns true if user has role_id 8 and reloads', () => {
    localStorage.setItem('data', JSON.stringify({ user: { user_role_list: [{ role_id: 8 }] } }));
    const service = createService();
    expect(service.isTester()).toBe(true);
    expect(localStorage.getItem('isTester')).toBe('true');
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('isTester returns false if not tester', () => {
    localStorage.setItem('data', JSON.stringify({ user: { user_role_list: [{ role_id: 1 }] } }));
    const service = createService();
    expect(service.isTester()).toBe(false);
  });

  it('isTester returns false if no data in localStorage', () => {
    const service = createService();
    expect(service.isTester()).toBe(false);
  });

  it('getCurrentTitle works without showSectionHeaderActions in data', () => {
    const route = createRouteMock({ title: 'Test Title' });
    const cache = { ...cacheMock, showSectionHeaderActions: { set: jest.fn() }, currentRouteTitle: { set: jest.fn() } };
    const service = createService({ cache, route });
    // @ts-ignore
    service['getCurrentTitle']();
    expect(cache.showSectionHeaderActions.set).toHaveBeenCalledWith(false);
    expect(cache.currentRouteTitle.set).toHaveBeenCalledWith('Test Title');
  });

  it('initAllTools does not call anything if isTester', () => {
    const service = createService();
    jest.spyOn(service, 'isTester').mockReturnValue(true);
    service.initAllTools();
    expect(service.clarity.init).not.toHaveBeenCalled();
    expect(service.googleAnalytics.init).not.toHaveBeenCalled();
    expect(service.hotjar.init).not.toHaveBeenCalled();
  });

  it('initAllTools calls all inits if not tester', () => {
    const service = createService();
    jest.spyOn(service, 'isTester').mockReturnValue(false);
    service.initAllTools();
    expect(service.clarity.init).toHaveBeenCalled();
    expect(service.googleAnalytics.init).toHaveBeenCalled();
    expect(service.hotjar.init).toHaveBeenCalled();
  });

  it('updateAllTools does not call anything if isTester', () => {
    const service = createService();
    jest.spyOn(service, 'isTester').mockReturnValue(true);
    service.updateAllTools('/url');
    expect(service.hotjar.updateState).not.toHaveBeenCalled();
    expect(service.clarity.updateState).not.toHaveBeenCalled();
    expect(service.googleAnalytics.updateState).not.toHaveBeenCalled();
  });

  it('updateAllTools calls all updates if not tester', () => {
    const service = createService();
    jest.spyOn(service, 'isTester').mockReturnValue(false);
    service.updateAllTools('/url');
    expect(service.hotjar.updateState).toHaveBeenCalledWith('/url');
    expect(service.clarity.updateState).toHaveBeenCalledWith('/url');
    expect(service.googleAnalytics.updateState).toHaveBeenCalledWith('/url');
  });

  it('init executes rxjs filter predicate and subscribe when NavigationEnd', async () => {
    const url = '/nav-end';
    const router: any = { events: of(new NavigationEnd(1, url, url)) };
    const cache = { ...cacheMock, hasSmallScreen: jest.fn().mockReturnValue(false) };
    // @ts-ignore
    const service = Object.create(TrackingToolsService.prototype) as TrackingToolsService;
    // @ts-ignore
    service.cache = cache;
    // @ts-ignore
    service.clarity = clarityMock;
    // @ts-ignore
    service.hotjar = hotjarMock;
    // @ts-ignore
    service.bugherd = bugherdMock;
    // @ts-ignore
    service.googleAnalytics = googleAnalyticsMock;
    // @ts-ignore
    service.route = createRouteMock({ title: 'T' });
    // @ts-ignore
    service.router = router;
    await service.init();
    expect(cache.currentUrlPath.set).toHaveBeenCalledWith(url);
    expect(clarityMock.updateState).toHaveBeenCalledWith(url);
    expect(googleAnalyticsMock.updateState).toHaveBeenCalledWith(url);
    expect(hotjarMock.updateState).toHaveBeenCalledWith(url);
  });

  it('init executes rxjs filter predicate returns false for non NavigationEnd', async () => {
    const router: any = { events: of({} as any) };
    const cache = { ...cacheMock };
    // @ts-ignore
    const service = Object.create(TrackingToolsService.prototype) as TrackingToolsService;
    // @ts-ignore
    service.cache = cache;
    // @ts-ignore
    service.clarity = clarityMock;
    // @ts-ignore
    service.hotjar = hotjarMock;
    // @ts-ignore
    service.bugherd = bugherdMock;
    // @ts-ignore
    service.googleAnalytics = googleAnalyticsMock;
    // @ts-ignore
    service.route = createRouteMock({ title: 'T' });
    // @ts-ignore
    service.router = router;
    await service.init();
    expect(cache.currentUrlPath.set).not.toHaveBeenCalled();
    expect(clarityMock.updateState).not.toHaveBeenCalled();
    expect(googleAnalyticsMock.updateState).not.toHaveBeenCalled();
    expect(hotjarMock.updateState).not.toHaveBeenCalled();
  });

  it('should cover inject assignments with TestBed', () => {
    TestBed.configureTestingModule({
      providers: [
        TrackingToolsService,
        { provide: 'CacheService', useValue: cacheMock },
        { provide: 'ClarityService', useValue: clarityMock },
        { provide: 'HotjarService', useValue: hotjarMock },
        { provide: 'BugHerdService', useValue: bugherdMock },
        { provide: 'GoogleAnalyticsService', useValue: googleAnalyticsMock },
        { provide: ActivatedRoute, useValue: createRouteMock() },
        { provide: Router, useValue: { events: { pipe: jest.fn(() => ({ subscribe: jest.fn() })) } } }
      ]
    });
    const service = TestBed.inject(TrackingToolsService);
    expect(service).toBeTruthy();
    expect(service.cache).toBeDefined();
    expect(service.clarity).toBeDefined();
    expect(service.hotjar).toBeDefined();
    expect(service.bugherd).toBeDefined();
    expect(service.googleAnalytics).toBeDefined();
    expect(service.route).toBeDefined();
    expect(service['router']).toBeDefined();
  });
});
