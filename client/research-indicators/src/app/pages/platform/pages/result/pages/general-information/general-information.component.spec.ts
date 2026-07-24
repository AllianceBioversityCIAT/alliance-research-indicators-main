import { ComponentFixture, TestBed } from '@angular/core/testing';
import GeneralInformationComponent from './general-information.component';
import {
  actionsServiceMock,
  cacheServiceMock,
  apiServiceMock,
  submissionServiceMock,
  getMetadataServiceMock,
  routerMock
} from 'src/app/testing/mock-services.mock';

// Inline mocks for missing services
const getResultsServiceMock = {
  updateList: jest.fn()
};

const getUserStaffServiceMock = {
  getData: jest.fn().mockResolvedValue({ data: [] })
};

const versionWatcherServiceMock = {
  onVersionChange: jest.fn()
};
import { ActionsService } from '@shared/services/actions.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { ApiService } from '@shared/services/api.service';
import { SubmissionService } from '@shared/services/submission.service';
import { GetMetadataService } from '@shared/services/get-metadata.service';
import { ActivatedRoute, Router } from '@angular/router';
import { GetResultsService } from '@shared/services/control-list/get-results.service';
import { GetUserStaffService } from '@shared/services/control-list/get-user-staff.service';
import { VersionWatcherService } from '@shared/services/version-watcher.service';
import { ServiceLocatorService } from '@shared/services/service-locator.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { GeneralInformation } from '@interfaces/result/general-information.interface';

jest.mock('../../../../../../shared/services/control-list/get-results.service');
jest.mock('../../../../../../shared/services/control-list/get-user-staff.service');
jest.mock('@shared/services/version-watcher.service');
jest.mock('@shared/services/service-locator.service');

describe('GeneralInformationComponent', () => {
  let component: GeneralInformationComponent;
  let fixture: ComponentFixture<GeneralInformationComponent>;
  let actionsService: jest.Mocked<ActionsService>;
  let cacheService: jest.Mocked<CacheService>;
  let apiService: jest.Mocked<ApiService>;
  let submissionService: jest.Mocked<SubmissionService>;
  let router: jest.Mocked<Router>;
  let getResultsService: jest.Mocked<GetResultsService>;
  let route: ActivatedRoute;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneralInformationComponent],
      providers: [
        { provide: ActionsService, useValue: actionsServiceMock },
        { provide: CacheService, useValue: cacheServiceMock },
        { provide: GetResultsService, useValue: getResultsServiceMock },
        { provide: GetUserStaffService, useValue: getUserStaffServiceMock },
        { provide: VersionWatcherService, useValue: versionWatcherServiceMock },
        {
          provide: ServiceLocatorService,
          useValue: {
            get: jest.fn().mockReturnValue({ loading: jest.fn().mockReturnValue(false) }),
            getService: jest.fn().mockReturnValue({
              loading: jest.fn().mockReturnValue(false),
              list: jest.fn().mockResolvedValue([]),
              isOpenSearch: jest.fn().mockReturnValue(false),
              getData: jest.fn().mockResolvedValue([]),
              search: jest.fn().mockResolvedValue([]),
              filter: jest.fn().mockResolvedValue([]),
              visibleOptions: jest.fn().mockReturnValue([])
            })
          }
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: jest.fn().mockReturnValue('123') }, queryParamMap: { get: jest.fn().mockReturnValue('1.0') } } }
        },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: SubmissionService, useValue: submissionServiceMock },
        { provide: GetMetadataService, useValue: getMetadataServiceMock },
        { provide: Router, useValue: routerMock }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(GeneralInformationComponent);
    component = fixture.componentInstance;
    actionsService = TestBed.inject(ActionsService) as jest.Mocked<ActionsService>;
    cacheService = TestBed.inject(CacheService) as jest.Mocked<CacheService>;
    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
    submissionService = TestBed.inject(SubmissionService) as jest.Mocked<SubmissionService>;
    router = TestBed.inject(Router) as jest.Mocked<Router>;
    getResultsService = TestBed.inject(GetResultsService) as jest.Mocked<GetResultsService>;
    route = TestBed.inject(ActivatedRoute);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call getData and set body', async () => {
    const mockData: GeneralInformation = {
      title: 'Test Title',
      description: 'Test Description',
      year: '2024',
      keywords: ['test'],
      user_id: '1',
      main_contact_person: { user_id: '1' }
    };
    (apiService as any).GET_GeneralInformation = jest.fn().mockResolvedValue({ data: mockData });
    (cacheService as any).currentResultId = jest.fn().mockReturnValue(123);

    await component.getData();

    expect((apiService as any).GET_GeneralInformation).toHaveBeenCalledWith(123);
    expect(component.body()).toEqual(mockData);
  });

  it('should call saveData and update everything if editable', async () => {
    const mockData: GeneralInformation = {
      title: 'Test Title',
      description: 'Test Description',
      year: '2024',
      keywords: ['test'],
      user_id: '1',
      main_contact_person: { user_id: '1' }
    };
    component.body.set(mockData);
    (submissionService as any).isEditableStatus = jest.fn().mockReturnValue(true);
    (apiService as any).PATCH_GeneralInformation = jest.fn().mockResolvedValue({
      successfulRequest: true,
      status: 200,
      data: mockData
    });
    (cacheService as any).currentResultId = jest.fn().mockReturnValue(123);
    (apiService as any).GET_GeneralInformation = jest.fn().mockResolvedValue({ data: mockData });

    await component.saveData();

    expect((apiService as any).PATCH_GeneralInformation).toHaveBeenCalledWith(123, mockData);
    expect((actionsService as any).showToast).toHaveBeenCalled();
    expect((getResultsService as any).updateList).toHaveBeenCalled();
  });

  it('should not call PATCH_GeneralInformation if not editable', async () => {
    (submissionService as any).isEditableStatus = jest.fn().mockReturnValue(false);
    (apiService as any).PATCH_GeneralInformation = jest.fn().mockResolvedValue({
      successfulRequest: true,
      status: 200
    });
    (cacheService as any).currentResultId = jest.fn().mockReturnValue(123);

    await component.saveData();

    expect((apiService as any).PATCH_GeneralInformation).not.toHaveBeenCalled();
  });

  it('should navigate to next page if page is next', async () => {
    const mockData: GeneralInformation = {
      title: 'Test Title',
      description: 'Test Description',
      year: '2024',
      keywords: ['test'],
      user_id: '1',
      main_contact_person: { user_id: '1' }
    };
    component.body.set(mockData);
    (submissionService as any).isEditableStatus = jest.fn().mockReturnValue(true);
    (apiService as any).PATCH_GeneralInformation = jest.fn().mockResolvedValue({
      successfulRequest: true,
      status: 200,
      data: mockData
    });
    (cacheService as any).currentResultId = jest.fn().mockReturnValue(123);
    (apiService as any).GET_GeneralInformation = jest.fn().mockResolvedValue({ data: mockData });

    await component.saveData('next');

    expect(router.navigate).toHaveBeenCalledWith(['result', '123', 'alliance-alignment'], { queryParams: { version: '1.0' }, replaceUrl: true });
  });

  it('should handle error in getData gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    (apiService as any).GET_GeneralInformation = jest.fn().mockRejectedValue(new Error('Test error'));
    (cacheService as any).currentResultId = jest.fn().mockReturnValue(123);

    await expect(component.getData()).rejects.toThrow('Test error');

    consoleSpy.mockRestore();
  });

  it('should handle error in saveData gracefully', async () => {
    const mockData: GeneralInformation = {
      title: 'Test Title',
      description: 'Test Description',
      year: '2024',
      keywords: ['test'],
      user_id: '1',
      main_contact_person: { user_id: '1' }
    };
    component.body.set(mockData);
    (submissionService as any).isEditableStatus = jest.fn().mockReturnValue(true);
    (apiService as any).PATCH_GeneralInformation = jest.fn().mockResolvedValue({
      successfulRequest: false,
      status: 409,
      errorDetail: { errors: 'The name of the result is already registered' }
    });
    (cacheService as any).currentResultId = jest.fn().mockReturnValue(123);

    await component.saveData();

    expect((actionsService as any).showToast).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error',
      detail: 'The name of the result is already registered'
    });
    expect(component.loading()).toBe(false);
  });

  it('should use errorDetail.detail when errors is not present on save failure', async () => {
    const mockData: GeneralInformation = {
      title: 'Test Title',
      description: 'Test Description',
      year: '2024',
      keywords: ['test'],
      user_id: '1',
      main_contact_person: { user_id: '1' }
    };
    component.body.set(mockData);
    (submissionService as any).isEditableStatus = jest.fn().mockReturnValue(true);
    (apiService as any).PATCH_GeneralInformation = jest.fn().mockResolvedValue({
      successfulRequest: false,
      errorDetail: { detail: 'Server validation failed' }
    });
    (cacheService as any).currentResultId = jest.fn().mockReturnValue(123);

    await component.saveData();

    expect((actionsService as any).showToast).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error',
      detail: 'Server validation failed'
    });
    expect(component.loading()).toBe(false);
  });

  it('should use default error message when errorDetail has no errors or detail', async () => {
    const mockData: GeneralInformation = {
      title: 'Test Title',
      description: 'Test Description',
      year: '2024',
      keywords: ['test'],
      user_id: '1',
      main_contact_person: { user_id: '1' }
    };
    component.body.set(mockData);
    (submissionService as any).isEditableStatus = jest.fn().mockReturnValue(true);
    (apiService as any).PATCH_GeneralInformation = jest.fn().mockResolvedValue({
      successfulRequest: false,
      errorDetail: {}
    });
    (cacheService as any).currentResultId = jest.fn().mockReturnValue(123);

    await component.saveData();

    expect((actionsService as any).showToast).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error',
      detail: 'Unable to save data, please try again'
    });
    expect(component.loading()).toBe(false);
  });

  it('should show a warning and avoid service calls when portafolio change before saving', async () => {
    const originalData: GeneralInformation = {
      title: 'Test Title',
      description: 'Test Description',
      year: '2025',
      keywords: ['test'],
      user_id: '1',
      main_contact_person: { user_id: '1' }
    };
    (apiService as any).GET_GeneralInformation = jest.fn().mockResolvedValue({ data: originalData });
    (apiService as any).PATCH_GeneralInformation = jest.fn().mockResolvedValue({ successfulRequest: true, status: 200 });
    (submissionService as any).isEditableStatus = jest.fn().mockReturnValue(true);
    (cacheService as any).currentMetadata = jest.fn().mockReturnValue({
      report_year: 2025,
      portfolio: { id: 1, name: 'Portfolio 1', start_year: 2021, end_year: 2025 }
    });
    (actionsService.showGlobalAlert as jest.Mock).mockClear();

    await component.getData();
    component.body.update(current => ({ ...current, year: '2026' }));
    await component.saveData();

    expect(actionsService.showGlobalAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warning',
        summary: 'Portafolio Change',
        detail: expect.stringContaining('This change could affect the portfolio period'),
        confirmCallback: expect.objectContaining({ label: 'Continue' }),
        cancelCallback: expect.objectContaining({ label: 'Cancel' })
      })
    );
    expect((apiService as any).PATCH_GeneralInformation).not.toHaveBeenCalled();
    expect(component.loading()).toBe(false);
  });

  it('should save without warning when reporting year remains inside the current portfolio range', async () => {
    const originalData: GeneralInformation = {
      title: 'Test Title',
      description: 'Test Description',
      year: '2025',
      keywords: ['test'],
      user_id: '1',
      main_contact_person: { user_id: '1' }
    };
    (apiService as any).GET_GeneralInformation = jest.fn().mockResolvedValue({ data: originalData });
    (apiService as any).PATCH_GeneralInformation = jest.fn().mockResolvedValue({ successfulRequest: true, status: 200 });
    (submissionService as any).isEditableStatus = jest.fn().mockReturnValue(true);
    (cacheService as any).currentMetadata = jest.fn().mockReturnValue({
      report_year: 2025,
      portfolio: { id: 1, name: 'Portfolio 1', start_year: 2021, end_year: 2025 }
    });
    (actionsService.showGlobalAlert as jest.Mock).mockClear();

    await component.getData();
    component.body.update(current => ({ ...current, year: '2024' }));
    await component.saveData();

    expect(actionsService.showGlobalAlert).not.toHaveBeenCalled();
    expect((apiService as any).PATCH_GeneralInformation).toHaveBeenCalledWith(123, expect.objectContaining({ year: '2024' }));
  });

  it('should continue saving after confirming the portafolio change warning', async () => {
    const originalData: GeneralInformation = {
      title: 'Test Title',
      description: 'Test Description',
      year: '2025',
      keywords: ['test'],
      user_id: '1',
      main_contact_person: { user_id: '1' }
    };
    const updatedData = { ...originalData, year: '2026' };
    (apiService as any).GET_GeneralInformation = jest.fn().mockResolvedValueOnce({ data: originalData }).mockResolvedValue({ data: updatedData });
    (apiService as any).PATCH_GeneralInformation = jest.fn().mockResolvedValue({ successfulRequest: true, status: 200 });
    (submissionService as any).isEditableStatus = jest.fn().mockReturnValue(true);
    (cacheService as any).currentMetadata = jest.fn().mockReturnValue({
      report_year: 2025,
      portfolio: { id: 1, name: 'Portfolio 1', start_year: 2021, end_year: 2025 }
    });
    (actionsService.showGlobalAlert as jest.Mock).mockClear();

    await component.getData();
    component.body.update(current => ({ ...current, year: '2026' }));
    await component.saveData();

    const warning = (actionsService.showGlobalAlert as jest.Mock).mock.calls[0][0];
    warning.confirmCallback.event();
    await Promise.resolve();
    await Promise.resolve();

    expect((apiService as any).PATCH_GeneralInformation).toHaveBeenCalledWith(123, expect.objectContaining({ year: '2026' }));
  });

  it('should show error toast when status is 409 (conflict)', async () => {
    const mockData: GeneralInformation = {
      title: 'Test Title',
      description: 'Test Description',
      year: '2024',
      keywords: ['test'],
      user_id: '1',
      main_contact_person: { user_id: '1' }
    };
    component.body.set(mockData);
    (submissionService as any).isEditableStatus = jest.fn().mockReturnValue(true);
    (apiService as any).PATCH_GeneralInformation = jest.fn().mockResolvedValue({
      successfulRequest: true,
      status: 409,
      errorDetail: { detail: 'Version conflict' }
    });
    (cacheService as any).currentResultId = jest.fn().mockReturnValue(123);

    await component.saveData();

    expect((actionsService as any).showToast).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error',
      detail: 'Version conflict'
    });
    expect(component.loading()).toBe(false);
  });

  it('should handle getData when response has no main_contact_person', async () => {
    const mockData = {
      title: 'Test Title',
      description: 'Test Description',
      year: '2024',
      keywords: ['test'],
      user_id: '1'
    };
    (apiService as any).GET_GeneralInformation = jest.fn().mockResolvedValue({ data: mockData });
    (cacheService as any).currentResultId = jest.fn().mockReturnValue(123);

    await component.getData();

    expect(component.body().title).toBe('Test Title');
    expect(component.body().user_id).toBe('1');
  });

  it('should handle getData when response has main_contact_person with user_id', async () => {
    const mockData = {
      title: 'Test Title',
      description: 'Test Description',
      year: '2024',
      keywords: ['test'],
      main_contact_person: { user_id: '2' }
    };
    (apiService as any).GET_GeneralInformation = jest.fn().mockResolvedValue({ data: mockData });
    (cacheService as any).currentResultId = jest.fn().mockReturnValue(123);

    await component.getData();

    expect(component.body().title).toBe('Test Title');
    expect(component.body().user_id).toBe('2');
  });

  it('should navigate to next page without version query param', async () => {
    const mockData: GeneralInformation = {
      title: 'Test Title',
      description: 'Test Description',
      year: '2024',
      keywords: ['test'],
      user_id: '1',
      main_contact_person: { user_id: '1' }
    };
    component.body.set(mockData);
    (submissionService as any).isEditableStatus = jest.fn().mockReturnValue(true);
    (apiService as any).PATCH_GeneralInformation = jest.fn().mockResolvedValue({
      successfulRequest: true,
      status: 200,
      data: mockData
    });
    (cacheService as any).currentResultId = jest.fn().mockReturnValue(123);
    (apiService as any).GET_GeneralInformation = jest.fn().mockResolvedValue({ data: mockData });
    (route as any).snapshot = { paramMap: { get: jest.fn().mockReturnValue('123') }, queryParamMap: { get: jest.fn().mockReturnValue(null) } };

    await component.saveData('next');

    expect(routerMock.navigate).toHaveBeenCalledWith(['result', '123', 'alliance-alignment'], { queryParams: undefined, replaceUrl: true });
  });

  it('should handle saveData when not editable and page is next', async () => {
    (submissionService as any).isEditableStatus = jest.fn().mockReturnValue(false);
    (route as any).snapshot = { paramMap: { get: jest.fn().mockReturnValue('123') }, queryParamMap: { get: jest.fn().mockReturnValue('1.0') } };

    await component.saveData('next');

    expect(routerMock.navigate).toHaveBeenCalledWith(['result', '123', 'alliance-alignment'], { queryParams: { version: '1.0' }, replaceUrl: true });
  });

  it('should handle saveData when editable but no page parameter', async () => {
    const mockData: GeneralInformation = {
      title: 'Test Title',
      description: 'Test Description',
      year: '2024',
      keywords: ['test'],
      user_id: '1',
      main_contact_person: { user_id: '1' }
    };
    component.body.set(mockData);
    (submissionService as any).isEditableStatus = jest.fn().mockReturnValue(true);
    (apiService as any).PATCH_GeneralInformation = jest.fn().mockResolvedValue({
      successfulRequest: true,
      status: 200,
      data: mockData
    });
    (cacheService as any).currentResultId = jest.fn().mockReturnValue(123);
    (apiService as any).GET_GeneralInformation = jest.fn().mockResolvedValue({ data: mockData });

    // Reset router mock calls
    (routerMock.navigate as jest.Mock).mockClear();

    await component.saveData();

    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(component.loading()).toBe(false);
  });

  it('should handle getData when response has no data', async () => {
    (apiService as any).GET_GeneralInformation = jest.fn().mockResolvedValue({ data: {} });
    (cacheService as any).currentResultId = jest.fn().mockReturnValue(123);

    await component.getData();

    expect(component.body().title).toBeUndefined();
  });

  it('should handle getData when response data is null', async () => {
    (apiService as any).GET_GeneralInformation = jest.fn().mockResolvedValue({ data: {} });
    (cacheService as any).currentResultId = jest.fn().mockReturnValue(123);

    await component.getData();

    expect(component.body().title).toBeUndefined();
  });

  describe('hasReportingYearChanged', () => {
    it('returns false when reporting year is empty', async () => {
      const originalData: GeneralInformation = {
        title: 'Test',
        description: 'Desc',
        year: '2025',
        keywords: [],
        user_id: '1',
        main_contact_person: { user_id: '1' }
      };
      (apiService as any).GET_GeneralInformation = jest.fn().mockResolvedValue({ data: originalData });
      (cacheService as any).currentMetadata = jest.fn().mockReturnValue({
        report_year: 2025,
        portfolio: { start_year: 2021, end_year: 2025 }
      });

      await component.getData();
      component.body.update(current => ({ ...current, year: undefined }));

      expect((component as any).hasReportingYearChanged()).toBe(false);
    });

    it('returns false when reporting year is unchanged', async () => {
      const originalData: GeneralInformation = {
        title: 'Test',
        description: 'Desc',
        year: '2025',
        keywords: [],
        user_id: '1',
        main_contact_person: { user_id: '1' }
      };
      (apiService as any).GET_GeneralInformation = jest.fn().mockResolvedValue({ data: originalData });
      (cacheService as any).currentMetadata = jest.fn().mockReturnValue({
        report_year: 2025,
        portfolio: { start_year: 2021, end_year: 2025 }
      });

      await component.getData();
      component.body.update(current => ({ ...current, year: 2025 }));

      expect((component as any).hasReportingYearChanged()).toBe(false);
    });

    it('returns false when changed year is still inside the portfolio range', async () => {
      const originalData: GeneralInformation = {
        title: 'Test',
        description: 'Desc',
        year: '2025',
        keywords: [],
        user_id: '1',
        main_contact_person: { user_id: '1' }
      };
      (apiService as any).GET_GeneralInformation = jest.fn().mockResolvedValue({ data: originalData });
      (cacheService as any).currentMetadata = jest.fn().mockReturnValue({
        report_year: 2025,
        portfolio: { start_year: 2021, end_year: 2025 }
      });
      await component.getData();
      component.body.update(current => ({ ...current, year: '2023' }));

      expect((component as any).hasReportingYearChanged()).toBe(false);
    });

    it('returns false when portfolio years are not finite', async () => {
      const originalData: GeneralInformation = {
        title: 'Test',
        description: 'Desc',
        year: '2025',
        keywords: [],
        user_id: '1',
        main_contact_person: { user_id: '1' }
      };
      (apiService as any).GET_GeneralInformation = jest.fn().mockResolvedValue({ data: originalData });
      (cacheService as any).currentMetadata = jest.fn().mockReturnValue({
        report_year: 2025,
        portfolio: { start_year: undefined, end_year: undefined }
      });

      await component.getData();
      component.body.update(current => ({ ...current, year: '2030' }));

      expect((component as any).hasReportingYearChanged()).toBe(false);
    });

    it('returns false when next year is not a finite number', async () => {
      const originalData: GeneralInformation = {
        title: 'Test',
        description: 'Desc',
        year: '2025',
        keywords: [],
        user_id: '1',
        main_contact_person: { user_id: '1' }
      };
      (apiService as any).GET_GeneralInformation = jest.fn().mockResolvedValue({ data: originalData });
      (cacheService as any).currentMetadata = jest.fn().mockReturnValue({
        report_year: 2025,
        portfolio: { start_year: 2021, end_year: 2025 }
      });

      await component.getData();
      component.body.update(current => ({ ...current, year: 'not-a-year' }));

      expect((component as any).hasReportingYearChanged()).toBe(false);
    });

    it('returns true when year moves before portfolio start', async () => {
      const originalData: GeneralInformation = {
        title: 'Test',
        description: 'Desc',
        year: '2025',
        keywords: [],
        user_id: '1',
        main_contact_person: { user_id: '1' }
      };
      (apiService as any).GET_GeneralInformation = jest.fn().mockResolvedValue({ data: originalData });
      (cacheService as any).currentMetadata = jest.fn().mockReturnValue({
        report_year: 2025,
        portfolio: { start_year: 2021, end_year: 2025 }
      });

      await component.getData();
      component.body.update(current => ({ ...current, year: '2019' }));

      expect((component as any).hasReportingYearChanged()).toBe(true);
    });

    it('uses report_year from metadata when initial year was not loaded', async () => {
      (apiService as any).GET_GeneralInformation = jest.fn().mockResolvedValue({
        data: { title: 'Test', description: 'Desc', keywords: [], user_id: '1' }
      });
      (cacheService as any).currentMetadata = jest.fn().mockReturnValue({
        report_year: 2025,
        portfolio: { start_year: 2021, end_year: 2025 }
      });

      await component.getData();
      component.body.update(current => ({ ...current, year: '2026' }));

      expect((component as any).hasReportingYearChanged()).toBe(true);
    });
  });

  it('should call getData when version watcher callback is invoked', async () => {
    const vw = TestBed.inject(VersionWatcherService) as jest.Mocked<VersionWatcherService>;
    const getDataSpy = jest.spyOn(component, 'getData').mockResolvedValue();
    // Component registers its callback in constructor; find the one that invokes our getData
    const calls = vw.onVersionChange.mock.calls;
    for (const call of calls) {
      getDataSpy.mockClear();
      await call[0]('1.0');
      if (getDataSpy.mock.calls.length > 0) break;
    }
    expect(getDataSpy).toHaveBeenCalled();
  });
});
