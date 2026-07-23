import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import GeographicScopeComponent from './geographic-scope.component';
import { ApiService } from '@shared/services/api.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { ActionsService } from '@shared/services/actions.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SubmissionService } from '@shared/services/submission.service';
import { VersionWatcherService } from '@shared/services/version-watcher.service';

jest.mock('@shared/utils/geographic-scope.util', () => ({
  getGeoScopeMultiselectTexts: jest.fn().mockReturnValue({
    country: { label: 'countries' },
    region: { label: 'regions' },
    subnational: { label: 'subnational' },
  }),
  isRegionsRequiredByScope: jest.fn().mockReturnValue(false),
  isCountriesRequiredByScope: jest.fn().mockReturnValue(false),
  isSubNationalRequiredByScope: jest.fn().mockReturnValue(false),
  mapCountriesToSubnationalSignals: jest.fn(),
  removeSubnationalRegionFromCountries: jest.fn(),
  syncSubnationalArrayFromSignals: jest.fn(),
  updateCountryRegions: jest.fn(),
  shouldShowSubnationalError: jest.fn().mockReturnValue(false),
}));

import {
  mapCountriesToSubnationalSignals,
  removeSubnationalRegionFromCountries,
  syncSubnationalArrayFromSignals,
  updateCountryRegions as utilUpdateCountryRegions,
  isRegionsRequiredByScope,
  isCountriesRequiredByScope,
  isSubNationalRequiredByScope,
  shouldShowSubnationalError,
  getGeoScopeMultiselectTexts,
} from '@shared/utils/geographic-scope.util';

describe('GeographicScopeComponent', () => {
  let component: GeographicScopeComponent;
  let fixture: ComponentFixture<GeographicScopeComponent>;

  const apiMock = {
    GET_GeoLocation: jest.fn(),
    PATCH_GeoLocation: jest.fn(),
  } as unknown as jest.Mocked<ApiService>;

  const cacheMock = {
    getCurrentNumericResultId: jest.fn().mockReturnValue(123),
    currentResultId: jest.fn().mockReturnValue('PR-1'),
    currentMetadata: jest.fn().mockReturnValue({ indicator_id: 5 }),
  } as unknown as jest.Mocked<CacheService>;

  const actionsMock = {
    showToast: jest.fn(),
  } as unknown as jest.Mocked<ActionsService>;

  const routerMock = {
    navigate: jest.fn(),
  } as unknown as jest.Mocked<Router>;

  const submissionMock = {
    isEditableStatus: jest.fn().mockReturnValue(true),
  } as unknown as jest.Mocked<SubmissionService>;

  let versionCallback: (() => void) | null = null;
  const versionWatcherMock = {
    onVersionChange: jest.fn((cb: () => void) => {
      versionCallback = cb;
    }),
  } as unknown as jest.Mocked<VersionWatcherService>;

  const routeMock = {
    snapshot: { queryParamMap: new Map<string, string | null>() },
  } as unknown as ActivatedRoute;

  beforeEach(async () => {
    jest.clearAllMocks();
    (routeMock.snapshot.queryParamMap as any) = {
      get: jest.fn().mockReturnValue('1'),
    };

    await TestBed.configureTestingModule({
      imports: [GeographicScopeComponent],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: CacheService, useValue: cacheMock },
        { provide: ActionsService, useValue: actionsMock },
        { provide: Router, useValue: routerMock },
        { provide: SubmissionService, useValue: submissionMock },
        { provide: VersionWatcherService, useValue: versionWatcherMock },
        { provide: ActivatedRoute, useValue: routeMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideTemplate(GeographicScopeComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(GeographicScopeComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call getData on version change', async () => {
    const spy = jest.spyOn(component as any, 'getData').mockResolvedValue(undefined as any);
    expect(versionCallback).toBeTruthy();
    versionCallback && versionCallback();
    expect(spy).toHaveBeenCalled();
  });

  it('canRemove should proxy submission service', () => {
    submissionMock.isEditableStatus.mockReturnValueOnce(true);
    expect(component.canRemove()).toBe(true);
    submissionMock.isEditableStatus.mockReturnValueOnce(false);
    expect(component.canRemove()).toBe(false);
  });

  it('onSelect should map and sync, and clear countries when geo_scope_id=5 and not first select', () => {
    (mapCountriesToSubnationalSignals as jest.Mock).mockClear();
    (syncSubnationalArrayFromSignals as jest.Mock).mockClear();

    component['isFirstSelect'] = false as any;
    component.body.set({ geo_scope_id: 5, countries: [{ isoAlpha2: 'CO' }] } as any);
    component.onSelect();
    expect(mapCountriesToSubnationalSignals).toHaveBeenCalled();
    expect(syncSubnationalArrayFromSignals).toHaveBeenCalled();
    expect(component.body().countries).toEqual([]);
  });

  it('onSelect should not clear countries when first select', () => {
    component['isFirstSelect'] = true as any;
    component.body.set({ geo_scope_id: 5, countries: [{ isoAlpha2: 'CO' }] } as any);
    component.onSelect();
    expect(component.body().countries).toEqual([{ isoAlpha2: 'CO' }]);
  });

  it('updateCountryRegions should delegate to util and keep body', () => {
    (utilUpdateCountryRegions as jest.Mock).mockClear();
    component.body.set({ countries: [{ isoAlpha2: 'PE' }] } as any);
    component.updateCountryRegions('PE', [{ sub_national_id: 1 } as any]);
    expect(utilUpdateCountryRegions).toHaveBeenCalledWith(component.body().countries, 'PE', [{ sub_national_id: 1 }]);
  });

  it('isArray should detect arrays only', () => {
    expect(component.isArray([1, 2])).toBe(true);
    expect(component.isArray('x')).toBe(false);
    expect(component.isArray(null)).toBe(false);
  });

  it('removeSubnationalRegion should call removeRegionById when removedId is defined', () => {
    (removeSubnationalRegionFromCountries as jest.Mock).mockReturnValueOnce(10);
    const instance = { endpointParams: { isoAlpha2: 'CO' }, removeRegionById: jest.fn() } as any;
    (component as any).multiselectInstances = [{ endpointParams: { isoAlpha2: 'CO' }, removeRegionById: instance.removeRegionById }] as any;
    component.body.set({ countries: [{ isoAlpha2: 'CO' }] } as any);
    component.removeSubnationalRegion({ isoAlpha2: 'CO' } as any, { sub_national_id: 10 } as any);
    expect(instance.removeRegionById).toHaveBeenCalledWith(10);
  });

  it('removeSubnationalRegion should skip removeRegionById when removedId is undefined', () => {
    (removeSubnationalRegionFromCountries as jest.Mock).mockReturnValueOnce(undefined);
    const instance = { endpointParams: { isoAlpha2: 'CO' }, removeRegionById: jest.fn() } as any;
    (component as any).multiselectInstances = [instance] as any;
    component.body.set({ countries: [{ isoAlpha2: 'CO' }] } as any);
    component.removeSubnationalRegion({ isoAlpha2: 'CO' } as any, { sub_national_id: 11 } as any);
    expect(instance.removeRegionById).not.toHaveBeenCalled();
  });

  it('getData should map sub_national names, set body, call map signals and toggle loading', async () => {
    const response = {
      data: {
        geo_scope_id: 1,
        countries: [
          {
            isoAlpha2: 'CO',
            result_countries_sub_nationals: [
              { sub_national: { name: 'A' } },
              { sub_national: undefined },
            ],
          },
        ],
      },
    };
    (apiMock.GET_GeoLocation as any).mockResolvedValue(response);
    await component.getData();
    expect(component.loading()).toBe(false);
    expect(component.body()).toEqual(response.data);
    expect(mapCountriesToSubnationalSignals).toHaveBeenCalled();
    // Ensure nullish coalescing applied
    expect(component.body().countries![0].result_countries_sub_nationals[1].name).toBe('');
  });

  it('saveData should PATCH, refresh, toast and navigate next/back with version', async () => {
    (submissionMock.isEditableStatus as any).mockReturnValue(true);
    (apiMock.PATCH_GeoLocation as any).mockResolvedValue({ successfulRequest: true });
    const getDataSpy = jest.spyOn(component as any, 'getData').mockResolvedValue(undefined as any);

    await component.saveData('next');
    expect(syncSubnationalArrayFromSignals).toHaveBeenCalled();
    expect(apiMock.PATCH_GeoLocation).toHaveBeenCalledWith(123, component.body());
    expect(getDataSpy).toHaveBeenCalled();
    expect(actionsMock.showToast).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['result', 'PR-1', 'links-to-result'], expect.any(Object));

    await component.saveData('back');
    expect(routerMock.navigate).toHaveBeenCalledWith(['result', 'PR-1', 'partners'], expect.any(Object));
  });

  it('saveData should early-return when PATCH unsuccessful and turn off loading', async () => {
    (submissionMock.isEditableStatus as any).mockReturnValue(true);
    (apiMock.PATCH_GeoLocation as any).mockResolvedValue({ successfulRequest: false });
    await component.saveData();
    expect(component.loading()).toBe(false);
  });

  it('saveData next should navigate to evidence when indicator_id is not 5', async () => {
    (cacheMock.currentMetadata as any).mockReturnValue({ indicator_id: 1 });
    (submissionMock.isEditableStatus as any).mockReturnValue(false);
    await component.saveData('next');
    expect(routerMock.navigate).toHaveBeenCalledWith(['result', 'PR-1', 'evidence'], expect.any(Object));
  });

  it('saveData should not PATCH when not editable and still navigate with/without version', async () => {
    (cacheMock.currentMetadata as any).mockReturnValue({ indicator_id: 5 });
    (submissionMock.isEditableStatus as any).mockReturnValue(false);
    // version present case
    await component.saveData('next');
    expect(apiMock.PATCH_GeoLocation).not.toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['result', 'PR-1', 'links-to-result'], expect.any(Object));

    // version null => no query params
    (routeMock.snapshot.queryParamMap as any).get.mockReturnValueOnce(null);
    await component.saveData('back');
    const call = (routerMock.navigate as jest.Mock).mock.calls.pop();
    const opts = call[1];
    expect(opts.queryParams).toBeUndefined();
  });

  it('isRegionsRequired, isCountriesRequired, isSubNationalRequired should compute from utils', () => {
    (isRegionsRequiredByScope as jest.Mock).mockReturnValueOnce(true);
    component.body.set({ geo_scope_id: 2 } as any);
    expect(component.isRegionsRequired()).toBe(true);

    (isCountriesRequiredByScope as jest.Mock).mockReturnValueOnce(true);
    component.body.set({ geo_scope_id: 4 } as any);
    expect(component.isCountriesRequired()).toBe(true);

    (isSubNationalRequiredByScope as jest.Mock).mockReturnValueOnce(true);
    component.body.set({ geo_scope_id: 5 } as any);
    expect(component.isSubNationalRequired()).toBe(true);
  });

  it('showSubnationalError should compute from util', () => {
    (shouldShowSubnationalError as jest.Mock).mockReturnValueOnce(true);
    component.body.set({ geo_scope_id: 5, countries: [{ isoAlpha2: 'CO' }] } as any);
    expect(component.showSubnationalError()).toBe(true);

    (shouldShowSubnationalError as jest.Mock).mockReturnValueOnce(false);
    component.body.set({ geo_scope_id: 4, countries: [{ isoAlpha2: 'CO' }] } as any);
    expect(component.showSubnationalError()).toBe(false);
  });

  it('getMultiselectLabel should delegate to util with current scope id', () => {
    (getGeoScopeMultiselectTexts as jest.Mock).mockClear();
    component.body.set({ geo_scope_id: 1 } as any);
    const r1 = component.getMultiselectLabel();
    expect((getGeoScopeMultiselectTexts as jest.Mock).mock.calls.pop()?.[0]).toBe(1);
    expect(r1.country.label).toBe('countries');

    component.body.set({ geo_scope_id: 2 } as any);
    component.getMultiselectLabel();
    expect((getGeoScopeMultiselectTexts as jest.Mock).mock.calls.pop()?.[0]).toBe(2);

    component.body.set({ geo_scope_id: 4 } as any);
    component.getMultiselectLabel();
    expect((getGeoScopeMultiselectTexts as jest.Mock).mock.calls.pop()?.[0]).toBe(4);
  });
});