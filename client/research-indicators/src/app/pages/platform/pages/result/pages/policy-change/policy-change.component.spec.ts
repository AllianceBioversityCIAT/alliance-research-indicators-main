import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import PolicyChangeComponent from './policy-change.component';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '@shared/services/api.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { ActionsService } from '@shared/services/actions.service';
import { SubmissionService } from '@shared/services/submission.service';
import { VersionWatcherService } from '@shared/services/version-watcher.service';

describe('PolicyChangeComponent', () => {
  let component: PolicyChangeComponent;
  let fixture: ComponentFixture<PolicyChangeComponent>;
  let mockApiService: any;
  let mockCacheService: any;
  let mockActionsService: any;
  let mockSubmissionService: any;
  let mockVersionWatcherService: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockApiService = {
      GET_PolicyChange: jest.fn(),
      PATCH_PolicyChange: jest.fn()
    };

    mockCacheService = {
      getCurrentNumericResultId: jest.fn().mockReturnValue(123),
      currentResultId: jest.fn().mockReturnValue('STAR-123')
    };

    mockActionsService = {
      showToast: jest.fn()
    };

    mockSubmissionService = {
      isEditableStatus: jest.fn().mockReturnValue(true)
    };

    mockVersionWatcherService = {
      onVersionChange: jest.fn()
    };

    mockRouter = {
      navigate: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PolicyChangeComponent, HttpClientTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: ActionsService, useValue: mockActionsService },
        { provide: SubmissionService, useValue: mockSubmissionService },
        { provide: VersionWatcherService, useValue: mockVersionWatcherService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: jest.fn().mockReturnValue('1.0')
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PolicyChangeComponent);
    component = fixture.componentInstance;
    // Don't call detectChanges to avoid template rendering issues
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.loading()).toBe(false);
    expect(component.body()).toEqual({});
    expect(component.policyStages().list).toHaveLength(3);
    expect(component.policyStages().loading).toBe(false);
  });

  it('should register version change callback in constructor', () => {
    expect(mockVersionWatcherService.onVersionChange).toHaveBeenCalled();
  });

  it('canRemove should return submission service result', () => {
    mockSubmissionService.isEditableStatus.mockReturnValue(true);
    expect(component.canRemove()).toBe(true);

    mockSubmissionService.isEditableStatus.mockReturnValue(false);
    expect(component.canRemove()).toBe(false);
  });

  it('should call getData when versionWatcher triggers version change', async () => {
    const spy = jest.spyOn(component, 'getData').mockResolvedValue();
    expect(mockVersionWatcherService.onVersionChange).toHaveBeenCalled();
    const cb = (mockVersionWatcherService.onVersionChange as jest.Mock).mock.calls[0][0];
    await cb();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should load data successfully', async () => {
    const mockData = { id: 1, name: 'Test Policy' };
    mockApiService.GET_PolicyChange.mockResolvedValue({ data: mockData });

    await component.getData();

    expect(mockApiService.GET_PolicyChange).toHaveBeenCalledWith(123);
    expect(component.loading()).toBe(false);
    expect(component.body()).toEqual({ ...mockData, loaded: true });
  });

  it('should handle getData error', async () => {
    const error = new Error('API Error');
    mockApiService.GET_PolicyChange.mockRejectedValue(error);

    await expect(component.getData()).rejects.toThrow('API Error');
    // Loading should remain true since the error is not caught in getData
    expect(component.loading()).toBe(true);
  });

  it('should save data when submission is editable', async () => {
    const mockBody = { id: 1, name: 'Test Policy' };
    component.body.set(mockBody);
    mockApiService.PATCH_PolicyChange.mockResolvedValue({ successfulRequest: true });
    mockApiService.GET_PolicyChange.mockResolvedValue({ data: mockBody });

    await component.saveData();

    expect(mockApiService.PATCH_PolicyChange).toHaveBeenCalledWith(123, mockBody);
    expect(mockActionsService.showToast).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'Policy Change',
      detail: 'Data saved successfully'
    });
    expect(mockApiService.GET_PolicyChange).toHaveBeenCalledWith(123);
  });

  it('should not save data when submission is not editable', async () => {
    mockSubmissionService.isEditableStatus.mockReturnValue(false);

    await component.saveData();

    expect(mockApiService.PATCH_PolicyChange).not.toHaveBeenCalled();
    expect(mockActionsService.showToast).not.toHaveBeenCalled();
  });

  it('should handle save data when API returns unsuccessful response', async () => {
    const mockBody = { id: 1, name: 'Test Policy' };
    component.body.set(mockBody);
    mockApiService.PATCH_PolicyChange.mockResolvedValue({ successfulRequest: false });

    await component.saveData();

    expect(mockApiService.PATCH_PolicyChange).toHaveBeenCalledWith(123, mockBody);
    expect(mockActionsService.showToast).not.toHaveBeenCalled();
    expect(mockApiService.GET_PolicyChange).not.toHaveBeenCalled();
  });

  it('should navigate to partners when page is next', async () => {
    mockApiService.PATCH_PolicyChange.mockResolvedValue({ successfulRequest: true });
    mockApiService.GET_PolicyChange.mockResolvedValue({ data: {} });
    
    await component.saveData('next');

    expect(mockRouter.navigate).toHaveBeenCalledWith(['result', 'STAR-123', 'partners'], {
      queryParams: { version: '1.0' },
      replaceUrl: true
    });
  });

  it('should navigate to alliance-alignment when page is back', async () => {
    mockApiService.PATCH_PolicyChange.mockResolvedValue({ successfulRequest: true });
    mockApiService.GET_PolicyChange.mockResolvedValue({ data: {} });
    
    await component.saveData('back');

    expect(mockRouter.navigate).toHaveBeenCalledWith(['result', 'STAR-123', 'alliance-alignment'], {
      queryParams: { version: '1.0' },
      replaceUrl: true
    });
  });

  it('should not navigate when page is undefined', async () => {
    mockApiService.PATCH_PolicyChange.mockResolvedValue({ successfulRequest: true });
    mockApiService.GET_PolicyChange.mockResolvedValue({ data: {} });
    
    await component.saveData();

    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should navigate without query params when version is null', async () => {
    const route = TestBed.inject(ActivatedRoute) as any;
    route.snapshot.queryParamMap.get = jest.fn().mockReturnValue(null);
    mockApiService.PATCH_PolicyChange.mockResolvedValue({ successfulRequest: true });
    mockApiService.GET_PolicyChange.mockResolvedValue({ data: {} });

    await component.saveData('next');

    expect(mockRouter.navigate).toHaveBeenCalledWith(['result', 'STAR-123', 'partners'], {
      queryParams: undefined,
      replaceUrl: true
    });
  });

  it('should navigate without query params when version is undefined', async () => {
    const route = TestBed.inject(ActivatedRoute) as any;
    route.snapshot.queryParamMap.get = jest.fn().mockReturnValue(undefined);
    mockApiService.PATCH_PolicyChange.mockResolvedValue({ successfulRequest: true });
    mockApiService.GET_PolicyChange.mockResolvedValue({ data: {} });

    await component.saveData('next');

    expect(mockRouter.navigate).toHaveBeenCalledWith(['result', 'STAR-123', 'partners'], {
      queryParams: undefined,
      replaceUrl: true
    });
  });

  it('should set loading to true and then false during saveData', async () => {
    const setLoadingSpy = jest.spyOn(component.loading, 'set');
    mockSubmissionService.isEditableStatus.mockReturnValue(false);

    await component.saveData();

    expect(setLoadingSpy).toHaveBeenCalledWith(true);
    expect(setLoadingSpy).toHaveBeenCalledWith(false);
  });

  it('should test navigateTo function directly', async () => {
    // Test the navigateTo function by calling saveData with different page values
    mockApiService.PATCH_PolicyChange.mockResolvedValue({ successfulRequest: true });
    mockApiService.GET_PolicyChange.mockResolvedValue({ data: {} });

    // Test 'next' navigation
    await component.saveData('next');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['result', 'STAR-123', 'partners'], {
      queryParams: { version: '1.0' },
      replaceUrl: true
    });

    // Reset mock
    mockRouter.navigate.mockClear();

    // Test 'back' navigation
    await component.saveData('back');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['result', 'STAR-123', 'alliance-alignment'], {
      queryParams: { version: '1.0' },
      replaceUrl: true
    });
  });
});
