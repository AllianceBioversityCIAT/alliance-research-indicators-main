import { ComponentFixture, TestBed } from '@angular/core/testing';
import IpRightsComponent from './ip-rights.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { PatchIpOwner } from '@shared/interfaces/patch-ip-owners';
import { ApiService } from '@shared/services/api.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { SubmissionService } from '@shared/services/submission.service';
import { ActionsService } from '@shared/services/actions.service';
import { VersionWatcherService } from '@shared/services/version-watcher.service';
import { apiServiceMock, cacheServiceMock } from 'src/app/testing/mock-services.mock';

// Mock VersionWatcherService
class MockVersionWatcherService {
  onVersionChange = jest.fn();
}

describe('IpRightsComponent', () => {
  let component: IpRightsComponent;
  let fixture: ComponentFixture<IpRightsComponent>;
  let apiMock: any;
  let router: any;
  let submissionMock: any;
  let actionsMock: any;
  let cacheMock: any;
  let versionWatcherMock: any;
  let routeMock: any;

  beforeEach(async () => {
    apiMock = {
      ...apiServiceMock,
      GET_IpOwner: jest
        .fn()
        .mockResolvedValue({ data: { publicity_restriction: true, potential_asset: false, requires_futher_development: undefined } }),
      PATCH_IpOwners: jest.fn().mockResolvedValue({ successfulRequest: true })
    };

    router = { navigate: jest.fn().mockResolvedValue(true) };

    submissionMock = {
      isEditableStatus: jest.fn().mockReturnValue(true)
    };

    actionsMock = {
      showToast: jest.fn()
    };

    cacheMock = {
      ...cacheServiceMock,
      currentResultId: jest.fn().mockReturnValue(123)
    };

    versionWatcherMock = new MockVersionWatcherService();

    routeMock = {
      snapshot: {
        paramMap: {
          get: jest.fn().mockReturnValue('123')
        },
        queryParamMap: {
          get: jest.fn().mockReturnValue(null)
        }
      }
    };

    await TestBed.configureTestingModule({
      imports: [IpRightsComponent, HttpClientTestingModule],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: Router, useValue: router },
        { provide: SubmissionService, useValue: submissionMock },
        { provide: ActionsService, useValue: actionsMock },
        { provide: CacheService, useValue: cacheMock },
        { provide: VersionWatcherService, useValue: versionWatcherMock },
        { provide: ActivatedRoute, useValue: routeMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(IpRightsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with version watcher subscription', () => {
    expect(versionWatcherMock.onVersionChange).toHaveBeenCalled();
  });

  it('should call getData when version watcher callback is invoked', async () => {
    const getDataSpy = jest.spyOn(component, 'getData').mockResolvedValue();
    const versionCb = versionWatcherMock.onVersionChange.mock.calls[0][0];
    await versionCb();
    expect(getDataSpy).toHaveBeenCalled();
  });

  describe('getData', () => {
    it('should load and normalize data correctly', async () => {
      await component.getData();

      expect(apiMock.GET_IpOwner).toHaveBeenCalledWith(123);
      expect(component.body()).toEqual({
        publicity_restriction: 1,
        potential_asset: 0,
        requires_futher_development: undefined
      });
    });

    it('should handle loading state correctly', async () => {
      expect(component.loading()).toBe(false);

      const getDataPromise = component.getData();
      expect(component.loading()).toBe(true);

      await getDataPromise;
      expect(component.loading()).toBe(false);
    });

    it('should normalize boolean values correctly', async () => {
      apiMock.GET_IpOwner.mockResolvedValue({
        data: {
          publicity_restriction: true,
          potential_asset: false,
          requires_futher_development: null
        }
      });

      await component.getData();

      expect(component.body()).toEqual({
        publicity_restriction: 1,
        potential_asset: 0,
        requires_futher_development: undefined
      });
    });
  });

  describe('saveData', () => {
    it('should save data successfully when editable', async () => {
      submissionMock.isEditableStatus.mockReturnValue(true);
      cacheMock.currentResultId = jest.fn().mockReturnValue(123);
      routeMock.snapshot.queryParamMap.get.mockReturnValue(null);
      component.body.set({
        publicity_restriction: 1,
        potential_asset: 0,
        requires_futher_development: undefined,
        asset_ip_owner: 1,
        asset_ip_owner_description: 'desc',
        publicity_restriction_description: 'desc',
        potential_asset_description: 'desc',
        requires_futher_development_description: 'desc'
      });

      await component.saveData();

      expect(apiMock.PATCH_IpOwners).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          asset_ip_owner: 1,
          asset_ip_owner_description: null,
          publicity_restriction: 1,
          publicity_restriction_description: 'desc',
          potential_asset: 0,
          potential_asset_description: null,
          requires_futher_development: undefined,
          requires_futher_development_description: null
        })
      );
      expect(actionsMock.showToast).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'IP rights',
        detail: 'Data saved successfully'
      });
      expect(component.loading()).toBe(false);
    });

    it('should clear asset_ip_owner_description when asset_ip_owner is not 4', async () => {
      submissionMock.isEditableStatus.mockReturnValue(true);
      cacheMock.currentResultId = jest.fn().mockReturnValue(123);
      component.body.set({
        asset_ip_owner: 1,
        asset_ip_owner_description: 'Some description',
        publicity_restriction: 0,
        potential_asset: 0,
        requires_futher_development: undefined,
        publicity_restriction_description: 'Some description',
        potential_asset_description: 'Some description',
        requires_futher_development_description: 'Some description'
      });

      await component.saveData();

      expect(apiMock.PATCH_IpOwners).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          asset_ip_owner: 1,
          asset_ip_owner_description: null
        })
      );
    });

    it('should not clear asset_ip_owner_description when asset_ip_owner is 4', async () => {
      submissionMock.isEditableStatus.mockReturnValue(true);
      cacheMock.currentResultId = jest.fn().mockReturnValue(123);
      component.body.set({
        asset_ip_owner: 4,
        asset_ip_owner_description: 'Some description',
        publicity_restriction: 0,
        potential_asset: 0,
        requires_futher_development: undefined,
        publicity_restriction_description: 'Some description',
        potential_asset_description: 'Some description',
        requires_futher_development_description: 'Some description'
      });

      await component.saveData();

      expect(apiMock.PATCH_IpOwners).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          asset_ip_owner: 4,
          asset_ip_owner_description: 'Some description'
        })
      );
    });

    it('should clear descriptions when corresponding fields are false/undefined', async () => {
      submissionMock.isEditableStatus.mockReturnValue(true);
      cacheMock.currentResultId = jest.fn().mockReturnValue(123);
      component.body.set({
        publicity_restriction: 0,
        potential_asset: 0,
        requires_futher_development: undefined,
        asset_ip_owner: 1,
        asset_ip_owner_description: 'Some description',
        publicity_restriction_description: 'Some description',
        potential_asset_description: 'Some description',
        requires_futher_development_description: 'Some description'
      });

      await component.saveData();

      expect(apiMock.PATCH_IpOwners).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          publicity_restriction_description: null,
          potential_asset_description: null,
          requires_futher_development_description: null
        })
      );
    });

    it('should not clear descriptions when corresponding fields are true', async () => {
      submissionMock.isEditableStatus.mockReturnValue(true);
      cacheMock.currentResultId = jest.fn().mockReturnValue(123);
      component.body.set({
        publicity_restriction: 1,
        potential_asset: 1,
        requires_futher_development: 1,
        asset_ip_owner: 1,
        asset_ip_owner_description: 'Some description',
        publicity_restriction_description: 'Some description',
        potential_asset_description: 'Some description',
        requires_futher_development_description: 'Some description'
      });

      await component.saveData();

      expect(apiMock.PATCH_IpOwners).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          publicity_restriction_description: 'Some description',
          potential_asset_description: 'Some description',
          requires_futher_development_description: 'Some description'
        })
      );
    });

    it('should handle unsuccessful API response', async () => {
      submissionMock.isEditableStatus.mockReturnValue(true);
      cacheMock.currentResultId = jest.fn().mockReturnValue(123);
      apiMock.PATCH_IpOwners.mockResolvedValue({ successfulRequest: false });

      await component.saveData();

      expect(component.loading()).toBe(false);
      expect(actionsMock.showToast).not.toHaveBeenCalled();
    });

    it('should navigate to evidence page when page is back', async () => {
      submissionMock.isEditableStatus.mockReturnValue(true);
      cacheMock.currentResultId = jest.fn().mockReturnValue(123);

      await component.saveData('back');

      expect(router.navigate).toHaveBeenCalledWith(['result', 123, 'evidence'], {
        queryParams: undefined,
        replaceUrl: true
      });
    });

    it('should include version in query params when available', async () => {
      submissionMock.isEditableStatus.mockReturnValue(true);
      cacheMock.currentResultId = jest.fn().mockReturnValue(123);
      routeMock.snapshot.queryParamMap.get.mockReturnValue('v2');

      await component.saveData('back');

      expect(router.navigate).toHaveBeenCalledWith(['result', 123, 'evidence'], {
        queryParams: { version: 'v2' },
        replaceUrl: true
      });
    });

    it('should not save when not editable status', async () => {
      submissionMock.isEditableStatus.mockReturnValue(false);
      cacheMock.currentResultId = jest.fn().mockReturnValue(123);

      await component.saveData();

      expect(apiMock.PATCH_IpOwners).not.toHaveBeenCalled();
      expect(actionsMock.showToast).not.toHaveBeenCalled();
      expect(component.loading()).toBe(false);
    });

    it('should handle loading state during save', async () => {
      submissionMock.isEditableStatus.mockReturnValue(true);
      cacheMock.currentResultId = jest.fn().mockReturnValue(123);

      const savePromise = component.saveData();
      expect(component.loading()).toBe(true);

      await savePromise;
      expect(component.loading()).toBe(false);
    });
  });

  describe('component lifecycle', () => {
    it('should have all required services injected', () => {
      expect(component.api).toBeTruthy();
      expect(component.router).toBeTruthy();
      expect(component.cache).toBeTruthy();
      expect(component.actions).toBeTruthy();
      expect(component.loading).toBeTruthy();
      expect(component.submission).toBeTruthy();
      expect(component.versionWatcher).toBeTruthy();
      expect(component.route).toBeTruthy();
    });

    it('should initialize body signal as empty object', () => {
      expect(component.body()).toEqual({});
    });

    it('should initialize loading signal as false', () => {
      expect(component.loading()).toBe(false);
    });
  });
});
