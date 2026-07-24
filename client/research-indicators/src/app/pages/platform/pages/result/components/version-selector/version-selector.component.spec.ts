import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VersionSelectorComponent } from './version-selector.component';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { GetMetadataService } from '@shared/services/get-metadata.service';
import { Subject } from 'rxjs';
import { PLATFORM_CODES } from '@shared/constants/platform-codes';
import { signal } from '@angular/core';

class MockApiService {
  GET_Versions = jest.fn().mockReturnValue(Promise.resolve({ data: { live: [], versions: [] } }));
  PATCH_ReportingCycle = jest.fn().mockReturnValue(Promise.resolve({ successfulRequest: true }));
}
class MockCacheService {
  currentResultId = jest.fn().mockReturnValue(1);
  lastResultId = signal(null);
  lastVersionParam = signal(null);
  liveVersionData = signal(null);
  versionsList = signal([]);
  extractNumericId = jest.fn((id: string | number) => {
    if (typeof id === 'number') return id;
    const parts = String(id).split('-');
    return parseInt(parts[parts.length - 1] ?? String(id), 10);
  });
  getCurrentNumericResultId = jest.fn(() => 1);
  getCurrentPlatformCode = signal('STAR');
}
class MockActionsService {
  showGlobalAlert = jest.fn();
  showToast = jest.fn();
}
class MockGetMetadataService {
  update = jest.fn();
}
class MockRouter {
  events = new Subject<NavigationEnd>();
  url = '/result/1/general-information';
  navigate = jest.fn().mockReturnValue(Promise.resolve(true));
}
class MockActivatedRoute {
  snapshot = { queryParamMap: { get: () => null } };
}

describe('VersionSelectorComponent', () => {
  let component: VersionSelectorComponent;
  let fixture: ComponentFixture<VersionSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DividerModule, TooltipModule, VersionSelectorComponent],
      providers: [
        { provide: ApiService, useClass: MockApiService },
        { provide: CacheService, useClass: MockCacheService },
        { provide: ActionsService, useClass: MockActionsService },
        { provide: GetMetadataService, useClass: MockGetMetadataService },
        { provide: Router, useClass: MockRouter },
        { provide: ActivatedRoute, useClass: MockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VersionSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call selectVersion and update selectedResultId', () => {
    const version = { result_id: 2, report_year_id: 2023 } as any;
    component.liveVersion.set({ result_id: 1 } as any);
    const router = TestBed.inject(Router);
    component.selectedResultId.set(0);
    component.selectVersion(version);
    expect(component.selectedResultId()).toBe(2);
    expect(router.navigate).toHaveBeenCalled();
  });

  it('selectVersion should merge from=results-center from route snapshot into queryParams', () => {
    const route = TestBed.inject(ActivatedRoute);
    const getSpy = jest.spyOn(route.snapshot.queryParamMap, 'get').mockImplementation((key: string) => {
      if (key === 'from') return 'results-center';
      return null;
    });
    const router = TestBed.inject(Router);
    (router.navigate as jest.Mock).mockClear();

    const version = { result_id: 2, report_year_id: 2023 } as any;
    component.liveVersion.set({ result_id: 1 } as any);
    component.selectVersion(version);

    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { version: '2023', from: 'results-center' },
        queryParamsHandling: 'merge',
        replaceUrl: true
      })
    );
    getSpy.mockRestore();
  });

  it('should return true for isSelected if ids match', () => {
    const version = { result_id: 5 } as any;
    component.selectedResultId.set(5);
    expect(component.isSelected(version)).toBe(true);
  });

  it('should return false for isSelected if ids do not match', () => {
    const version = { result_id: 6 } as any;
    component.selectedResultId.set(7);
    expect(component.isSelected(version)).toBe(false);
  });

  it('should return hasLiveVersion true if liveVersion is not null and status_id !== 6', () => {
    component.liveVersion.set({ result_status_id: 1 } as any);
    expect(component.hasLiveVersion).toBe(true);
  });

  it('should return hasLiveVersion false if liveVersion is null', () => {
    component.liveVersion.set(null);
    expect(component.hasLiveVersion).toBe(false);
  });

  it('should return liveVersionData', () => {
    component.liveVersion.set({ result_id: 10 } as any);
    expect(component.liveVersionData.result_id).toBe(10);
  });

  it('should call updateResult and showGlobalAlert', () => {
    const actions = TestBed.inject(ActionsService);
    component.updateResult();
    expect(actions.showGlobalAlert).toHaveBeenCalled();
  });

  it('should call loadVersions and update signals', async () => {
    const api = TestBed.inject(ApiService);
    const cache = TestBed.inject(CacheService);
    (api.GET_Versions as jest.Mock).mockResolvedValue({
      data: { live: [{ result_id: 1, result_status_id: 2 }], versions: [{ result_id: 2, report_year_id: 2023 }] }
    });
    const spyCurrentResultId = jest.spyOn(cache, 'currentResultId').mockReturnValue(123);
    await component['loadVersions']();
    expect(component.liveVersion()?.result_id).toBe(1);
    expect(component.approvedVersions().length).toBe(1);
    spyCurrentResultId.mockRestore();
  });

  it('should set approvedVersions to empty array when data.versions is not an array', async () => {
    const api = TestBed.inject(ApiService);
    (api.GET_Versions as jest.Mock).mockResolvedValue({
      data: { live: [{ result_id: 1, result_status_id: 2 }], versions: null }
    });
    await component['loadVersions']();
    expect(Array.isArray(component.approvedVersions())).toBe(true);
    expect(component.approvedVersions().length).toBe(0);
  });

  it('getVersionsArray should return array when valid and empty when invalid', () => {
    const valid = component['getVersionsArray']({ versions: [{ result_id: 1 } as any] });
    expect(Array.isArray(valid)).toBe(true);
    expect(valid.length).toBe(1);

    const invalid = component['getVersionsArray']({ versions: null });
    expect(Array.isArray(invalid)).toBe(true);
    expect(invalid.length).toBe(0);
  });

  it('should apply cached versions with versionParam', () => {
    const cache = TestBed.inject(CacheService) as any;
    cache.versionsList.set([{ result_id: 2, report_year_id: 2023, result_status_id: 1, result_official_code: 1 }]);
    cache.liveVersionData.set({ result_id: 1, result_status_id: 2, report_year_id: 2022, result_official_code: 1 });
    component['applyCachedVersions'](123, '2023');
    expect(component.selectedResultId()).toBe(2);
  });

  it('should apply cached versions without versionParam and live not status 6', () => {
    const cache = TestBed.inject(CacheService) as any;
    cache.versionsList.set([{ result_id: 2, report_year_id: 2023, result_status_id: 1, result_official_code: 1 }]);
    cache.liveVersionData.set({ result_id: 1, result_status_id: 2, report_year_id: 2022, result_official_code: 1 });
    component['applyCachedVersions'](123, null);
    expect(component.selectedResultId()).toBe(1);
  });

  it('should apply cached versions without versionParam and live status 6', () => {
    const cache = TestBed.inject(CacheService) as any;
    cache.versionsList.set([{ result_id: 2, report_year_id: 2023, result_status_id: 1, result_official_code: 1 }]);
    cache.liveVersionData.set({ result_id: 1, result_status_id: 6, report_year_id: 2022, result_official_code: 1 });
    component['applyCachedVersions'](123, null);
    expect(component.selectedResultId()).toBe(2);
  });

  it('should not proceed in loadVersions if resultId is invalid', async () => {
    const cache = TestBed.inject(CacheService);
    const spyCurrentResultId = jest.spyOn(cache, 'currentResultId').mockReturnValue(0);
    const spy = jest.spyOn<any, any>(component as any, 'applyCachedVersions');
    await component['loadVersions']();
    expect(spy).not.toHaveBeenCalled();
    spyCurrentResultId.mockRestore();
  });

  it('should not set selectedResultId if no live and no approved versions in applyCachedVersions', () => {
    const cache = TestBed.inject(CacheService) as any;
    cache.versionsList.set([]);
    cache.liveVersionData.set(null);
    component.selectedResultId.set(null);
    component['applyCachedVersions'](123, null);
    expect(component.selectedResultId()).toBe(null);
  });

  it('should not set selectedResultId if versionParam does not match any version', () => {
    const cache = TestBed.inject(CacheService) as any;
    cache.versionsList.set([{ result_id: 2, report_year_id: 2023 }]);
    cache.liveVersionData.set({ result_id: 1, result_status_id: 2 });
    component.selectedResultId.set(null);
    component['applyCachedVersions'](123, '9999');
    expect(component.selectedResultId()).toBe(null);
  });

  it('should not navigate in handleVersionSelection if currentChild is not general-information', () => {
    const router = TestBed.inject(Router);
    Object.defineProperty(router, 'url', { value: '/result/1/other-section', writable: true });
    component.selectedResultId.set(10);
    component['handleVersionSelection']({
      currentResultId: '1',
      liveData: { result_id: 10, result_status_id: 2, report_year_id: 2022, result_official_code: 1 },
      versionsArray: []
    });
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should not set selectedResultId in handleVersionSelection if already selected', () => {
    component.selectedResultId.set(10);
    component['handleVersionSelection']({
      currentResultId: '1',
      liveData: { result_id: 10, result_status_id: 2, report_year_id: 2022, result_official_code: 1 },
      versionsArray: []
    });
    expect(component.selectedResultId()).toBe(10);
  });

  it('should not navigate in handleVersionSelection if currentChild is not general-information and no liveData', () => {
    const router = TestBed.inject(Router);
    Object.defineProperty(router, 'url', { value: '/result/1/other-section', writable: true });
    component.selectedResultId.set(2);
    component['hasAutoNavigated'] = false;
    component['handleVersionSelection']({
      currentResultId: '1',
      liveData: null,
      versionsArray: [{ result_id: 2, report_year_id: 2023, result_status_id: 1, result_official_code: 1 }]
    });
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should not set selectedResultId in handleVersionSelection if already selected and no liveData', () => {
    component.selectedResultId.set(2);
    component['hasAutoNavigated'] = false;
    component['handleVersionSelection']({
      currentResultId: '1',
      liveData: null,
      versionsArray: [{ result_id: 2, report_year_id: 2023, result_status_id: 1, result_official_code: 1 }]
    });
    expect(component.selectedResultId()).toBe(2);
  });

  it('should call router.navigate with empty queryParams if selecting liveVersion', () => {
    const router = TestBed.inject(Router);
    const version = { result_id: 1, report_year_id: 2023 } as any;
    component.liveVersion.set({ result_id: 1 } as any);
    component.selectVersion(version);
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { version: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      })
    );
  });

  it('should call router.navigate with version param if not selecting liveVersion', () => {
    const router = TestBed.inject(Router);
    const version = { result_id: 2, report_year_id: 2023 } as any;
    component.liveVersion.set({ result_id: 1 } as any);
    component.selectVersion(version);
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { version: '2023' } }));
  });

  it('should call PATCH_ReportingCycle with empty string if data.selected is undefined', async () => {
    const api = TestBed.inject(ApiService);
    const actions = TestBed.inject(ActionsService);
    (api.PATCH_ReportingCycle as jest.Mock).mockResolvedValue({ successfulRequest: false, errorDetail: { errors: 'error' } });
    (actions.showGlobalAlert as jest.Mock).mockImplementation(arg => {
      arg.confirmCallback?.event?.({});
    });
    component.updateResult();
    await new Promise(r => setTimeout(r, 0));
    expect(api.PATCH_ReportingCycle).toHaveBeenCalledWith(expect.anything(), '');
  });

  it('should return false in isResultRouteActive if url does not start with /result/{id}', () => {
    const router = TestBed.inject(Router) as any;
    router.url = '/other/route';
    expect(component['isResultRouteActive'](123)).toBe(false);
  });

  it('should handle error if router.navigate promise is rejected in updateResult', () => {
    const api = TestBed.inject(ApiService);
    const actions = TestBed.inject(ActionsService);
    const router = TestBed.inject(Router);
    (api.PATCH_ReportingCycle as jest.Mock).mockResolvedValue({ successfulRequest: true });
    (router.navigate as jest.Mock).mockRejectedValue(new Error('Navigation failed'));
    (actions.showGlobalAlert as jest.Mock).mockImplementation(arg => {
      arg.confirmCallback?.event?.({ selected: '2023' });
    });
    expect(() => component.updateResult()).not.toThrow();
  });

  it('should handle error if loadVersions throws after navigation in updateResult', () => {
    const api = TestBed.inject(ApiService);
    const actions = TestBed.inject(ActionsService);
    const router = TestBed.inject(Router);
    (api.PATCH_ReportingCycle as jest.Mock).mockResolvedValue({ successfulRequest: true });
    (router.navigate as jest.Mock).mockResolvedValue(true);
    const originalLoadVersions = component['loadVersions'];
    component['loadVersions'] = jest.fn(() => {
      throw new Error('loadVersions error');
    });
    (actions.showGlobalAlert as jest.Mock).mockImplementation(arg => {
      arg.confirmCallback?.event?.({ selected: '2023' });
    });
    expect(() => component.updateResult()).not.toThrow();
    component['loadVersions'] = originalLoadVersions;
  });

  it('should not fail if confirmCallback.event is not defined in updateResult', () => {
    const actions = TestBed.inject(ActionsService);
    (actions.showGlobalAlert as jest.Mock).mockImplementation(arg => {
      delete arg.confirmCallback.event;
    });
    expect(() => component.updateResult()).not.toThrow();
  });

  it('should handle error if router.navigate promise is rejected in selectVersion', () => {
    const router = TestBed.inject(Router);
    (router.navigate as jest.Mock).mockRejectedValue(new Error('Navigation failed'));
    const version = { result_id: 2, report_year_id: 2023 } as any;
    component.liveVersion.set({ result_id: 1 } as any);
    expect(() => component.selectVersion(version)).not.toThrow();
  });

  it('should call loadVersions when a NavigationEnd event occurs', async () => {
    const router = TestBed.inject(Router) as any;
    const spy = jest.spyOn<any, any>(component as any, 'loadVersions').mockResolvedValue(undefined);
    router.events.next(new NavigationEnd(1, '/a', '/b'));
    await Promise.resolve();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should set selectedResultId from versionParam in handleVersionSelection', () => {
    const route = TestBed.inject(ActivatedRoute) as any;
    route.snapshot.queryParamMap.get = (k: string) => (k === 'version' ? '2023' : null);
    component.selectedResultId.set(999);
    component['handleVersionSelection']({
      currentResultId: '1',
      liveData: { result_id: 1, result_status_id: 2, report_year_id: 2022, result_official_code: 1 } as any,
      versionsArray: [{ result_id: 2, report_year_id: 2023, result_status_id: 1, result_official_code: 1 } as any]
    });
    expect(component.selectedResultId()).toBe(2);
  });

  it('should navigate when currentChild falls back to general-information (url short) and liveData present', () => {
    const router = TestBed.inject(Router) as any;
    const route = TestBed.inject(ActivatedRoute) as any;
    Object.defineProperty(router, 'url', { value: '/result/1', writable: true });
    route.snapshot.queryParamMap.get = () => null;
    component.selectedResultId.set(999);
    component['handleVersionSelection']({
      currentResultId: '1',
      liveData: { result_id: 10, result_status_id: 2, report_year_id: 2022, result_official_code: 1 } as any,
      versionsArray: []
    });
    expect(router.navigate).toHaveBeenCalledWith(['/result', '1', 'general-information'], {
      queryParams: { version: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  });

  describe('editInPlatform', () => {
    let windowOpenSpy: jest.SpyInstance;

    beforeEach(() => {
      windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    });

    afterEach(() => {
      windowOpenSpy.mockRestore();
    });

    it('should open PRMS URL when platform is PRMS', () => {
      const cache = TestBed.inject(CacheService) as any;
      cache.getCurrentPlatformCode.set(PLATFORM_CODES.PRMS);
      
      component.editInPlatform();
      
      expect(windowOpenSpy).toHaveBeenCalledWith(component.prmsUrl, '_blank', 'noopener,noreferrer');
    });

    it('should open TIP URL when platform is TIP', () => {
      const cache = TestBed.inject(CacheService) as any;
      cache.getCurrentPlatformCode.set(PLATFORM_CODES.TIP);
      
      component.editInPlatform();
      
      expect(windowOpenSpy).toHaveBeenCalledWith(component.tipUrl, '_blank', 'noopener,noreferrer');
    });

    it('should not open any URL when platform is not PRMS or TIP', () => {
      const cache = TestBed.inject(CacheService) as any;
      cache.getCurrentPlatformCode.set('OTHER');
      
      component.editInPlatform();
      
      expect(windowOpenSpy).not.toHaveBeenCalled();
    });

    it('should not open any URL when platform code is empty', () => {
      const cache = TestBed.inject(CacheService) as any;
      cache.getCurrentPlatformCode.set('');
      
      component.editInPlatform();
      
      expect(windowOpenSpy).not.toHaveBeenCalled();
    });
  });

  describe('platformEditButtonText', () => {
    it('should return "Edit in PRMS" when platform is PRMS', () => {
      const cache = TestBed.inject(CacheService) as any;
      cache.getCurrentPlatformCode.set(PLATFORM_CODES.PRMS);
      
      expect(component.platformEditButtonText).toBe('Edit in PRMS');
    });

    it('should return "Edit in TIP" when platform is TIP', () => {
      const cache = TestBed.inject(CacheService) as any;
      cache.getCurrentPlatformCode.set(PLATFORM_CODES.TIP);
      
      expect(component.platformEditButtonText).toBe('Edit in TIP');
    });

    it('should return "Edit in OTHER" when platform is OTHER', () => {
      const cache = TestBed.inject(CacheService) as any;
      cache.getCurrentPlatformCode.set('OTHER');
      
      expect(component.platformEditButtonText).toBe('Edit in OTHER');
    });

    it('should return "Edit in " when platform code is empty', () => {
      const cache = TestBed.inject(CacheService) as any;
      cache.getCurrentPlatformCode.set('');
      
      expect(component.platformEditButtonText).toBe('Edit in ');
    });
  });
});
