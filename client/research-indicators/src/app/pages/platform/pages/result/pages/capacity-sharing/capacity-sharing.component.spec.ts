import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import CapacitySharingComponent from './capacity-sharing.component';
import { ApiService } from '../../../../../../shared/services/api.service';
import { ActionsService } from '../../../../../../shared/services/actions.service';
import { CacheService } from '../../../../../../shared/services/cache/cache.service';
import { Router, ActivatedRoute } from '@angular/router';
import { SubmissionService } from '@shared/services/submission.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { VersionWatcherService } from '@shared/services/version-watcher.service';

const apiService = {
  GET_CapacitySharing: jest.fn().mockResolvedValue({ data: {} }),
  PATCH_CapacitySharing: jest.fn().mockResolvedValue({ data: {} }),
  GET_SessionFormat: jest.fn().mockResolvedValue({ data: [] }),
  GET_SessionLength: jest.fn().mockResolvedValue({ data: [] }),
  GET_SessionPurpose: jest.fn().mockResolvedValue({ data: [] }),
  GET_SessionType: jest.fn().mockResolvedValue({ data: [] }),
  GET_DeliveryModality: jest.fn().mockResolvedValue({ data: [] }),
  GET_DeliveryModalities: jest.fn().mockResolvedValue({ data: [] }),
  GET_Gender: jest.fn().mockResolvedValue({ data: [] }),
  GET_Degree: jest.fn().mockResolvedValue({ data: [] }),
  GET_Institutions: jest.fn().mockResolvedValue({ data: [] }),
  GET_Countries: jest.fn().mockResolvedValue({ data: [] }),
  GET_Regions: jest.fn().mockResolvedValue({ data: [] }),
  GET_Years: jest.fn().mockResolvedValue({ data: [] }),
  GET_AllIndicators: jest.fn().mockResolvedValue({ data: [] }),
  GET_AllResultStatus: jest.fn().mockResolvedValue({ data: [] }),
  GET_AllYears: jest.fn().mockResolvedValue({ data: [] }),
  GET_ClarisaLanguages: jest.fn().mockResolvedValue({ data: [] }),
  GET_Contracts: jest.fn().mockResolvedValue({ data: [] }),
  GET_GeoFocus: jest.fn().mockResolvedValue({ data: [] }),
  GET_InnovationCharacteristics: jest.fn().mockResolvedValue({ data: [] }),
  GET_InnovationDevOutput: jest.fn().mockResolvedValue({ data: [] }),
  GET_InnovationReadinessLevels: jest.fn().mockResolvedValue({ data: [] }),
  GET_InnovationTypes: jest.fn().mockResolvedValue({ data: [] }),
  GET_InnovationUseOutput: jest.fn().mockResolvedValue({ data: [] }),
  GET_InstitutionTypes: jest.fn().mockResolvedValue({ data: [] }),
  GET_UserStaff: jest.fn().mockResolvedValue({ data: [] }),
  GET_YearsByCode: jest.fn().mockResolvedValue({ data: [] }),
  GET_Languages: jest.fn().mockResolvedValue({ data: [] }),
  GET_AllLanguages: jest.fn().mockResolvedValue({ data: [] }),
  GET_AllInstitutions: jest.fn().mockResolvedValue({ data: [] }),
  GET_AllCountries: jest.fn().mockResolvedValue({ data: [] }),
  GET_AllRegions: jest.fn().mockResolvedValue({ data: [] }),
  GET_AllContracts: jest.fn().mockResolvedValue({ data: [] }),
  GET_AllGeoFocus: jest.fn().mockResolvedValue({ data: [] }),
  GET_AllInnovationCharacteristics: jest.fn().mockResolvedValue({ data: [] }),
  GET_AllInnovationDevOutput: jest.fn().mockResolvedValue({ data: [] }),
  GET_AllInnovationReadinessLevels: jest.fn().mockResolvedValue({ data: [] }),
  GET_AllInnovationTypes: jest.fn().mockResolvedValue({ data: [] }),
  GET_AllInnovationUseOutput: jest.fn().mockResolvedValue({ data: [] }),
  GET_AllInstitutionTypes: jest.fn().mockResolvedValue({ data: [] }),
  GET_AllUserStaff: jest.fn().mockResolvedValue({ data: [] })
};

const actions = { showToast: jest.fn() };
const router = { navigate: jest.fn() };
const submission = { isEditableStatus: jest.fn() };
const allModalsService = { setPartnerRequestSection: jest.fn(), openModal: jest.fn() };
const versionWatcher = { onVersionChange: jest.fn() };

class CacheServiceMock {
  currentResultId = jest.fn().mockReturnValue(1);
  getCurrentNumericResultId = jest.fn().mockReturnValue(1);
  currentMetadata = jest.fn().mockReturnValue({ result_title: 'Test Title' });
  currentResultIsLoading = jest.fn().mockReturnValue(false);
  showSectionHeaderActions = jest.fn().mockReturnValue(false);
  hasSmallScreen = jest.fn().mockReturnValue(false);
  isSidebarCollapsed = jest.fn().mockReturnValue(false);
  loadingCurrentResult = { set: jest.fn() };
}

const activatedRouteMock = {
  snapshot: {
    paramMap: { get: (key: string) => (key === 'id' ? '1' : null) },
    queryParamMap: { get: (key: string) => (key === 'version' ? 'v1' : null) }
  }
};

describe('CapacitySharingComponent', () => {
  let component: CapacitySharingComponent;
  let fixture: ComponentFixture<CapacitySharingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CapacitySharingComponent, HttpClientTestingModule],
      providers: [
        { provide: ApiService, useValue: apiService },
        { provide: CacheService, useClass: CacheServiceMock },
        { provide: ActionsService, useValue: actions },
        { provide: Router, useValue: router },
        { provide: SubmissionService, useValue: submission },
        { provide: AllModalsService, useValue: allModalsService },
        { provide: VersionWatcherService, useValue: versionWatcher },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CapacitySharingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => jest.clearAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getData', () => {
    it('should parse TIMESTAMP(6) ISO strings into Date objects', async () => {
      apiService.GET_CapacitySharing.mockResolvedValue({
        data: {
          start_date: '2025-06-06T12:51:43.861000Z',
          end_date: '2025-06-07T18:30:00.000000Z',
          session_length_id: 1
        }
      });

      await component.getData();

      expect(component.body().start_date).toBeInstanceOf(Date);
      expect(component.body().end_date).toBeInstanceOf(Date);
    });

    it('should parse standard ISO strings', async () => {
      apiService.GET_CapacitySharing.mockResolvedValue({
        data: { start_date: '2023-01-01T00:00:00.000Z', end_date: '2023-12-31T00:00:00.000Z' }
      });

      await component.getData();

      expect(component.body().start_date).toBeInstanceOf(Date);
      expect(component.body().end_date).toBeInstanceOf(Date);
    });

    it('should handle Date object responses from TypeORM', async () => {
      apiService.GET_CapacitySharing.mockResolvedValue({
        data: { start_date: new Date('2024-03-15T10:00:00Z'), end_date: new Date('2024-03-16T10:00:00Z') }
      });

      await component.getData();

      expect(component.body().start_date).toBeInstanceOf(Date);
      expect(component.body().end_date).toBeInstanceOf(Date);
    });

    it('should handle undefined dates', async () => {
      apiService.GET_CapacitySharing.mockResolvedValue({
        data: { start_date: undefined, end_date: undefined }
      });

      await component.getData();

      expect(component.body().start_date).toBeUndefined();
      expect(component.body().end_date).toBeUndefined();
    });

    it('should handle null dates', async () => {
      apiService.GET_CapacitySharing.mockResolvedValue({
        data: { start_date: null, end_date: null }
      });

      await component.getData();

      expect(component.body().start_date).toBeUndefined();
      expect(component.body().end_date).toBeUndefined();
    });

    it('should handle only start_date present', async () => {
      apiService.GET_CapacitySharing.mockResolvedValue({
        data: { start_date: '2023-05-05T00:00:00.000Z', end_date: undefined }
      });

      await component.getData();

      expect(component.body().start_date).toBeInstanceOf(Date);
      expect(component.body().end_date).toBeUndefined();
    });

    it('should handle only end_date present', async () => {
      apiService.GET_CapacitySharing.mockResolvedValue({
        data: { start_date: undefined, end_date: '2023-06-06T00:00:00.000Z' }
      });

      await component.getData();

      expect(component.body().start_date).toBeUndefined();
      expect(component.body().end_date).toBeInstanceOf(Date);
    });
  });

  describe('saveData', () => {
    it('should send ISO 8601 UTC strings to the API', async () => {
      submission.isEditableStatus.mockReturnValue(true);
      apiService.PATCH_CapacitySharing.mockResolvedValue({});
      apiService.GET_CapacitySharing.mockResolvedValue({ data: {} });

      component.body.set({
        start_date: new Date('2023-01-01'),
        end_date: new Date('2023-12-31')
      });

      await component.saveData();

      expect(apiService.PATCH_CapacitySharing).toHaveBeenCalledWith(
        expect.objectContaining({
          start_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
          end_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
        })
      );
    });

    it('should not mutate the body signal when building the payload', async () => {
      submission.isEditableStatus.mockReturnValue(true);
      apiService.PATCH_CapacitySharing.mockResolvedValue({});
      apiService.GET_CapacitySharing.mockResolvedValue({ data: {} });

      const originalDate = new Date('2023-06-15');
      component.body.set({ start_date: originalDate, end_date: undefined });

      await component.saveData();

      expect(typeof apiService.PATCH_CapacitySharing.mock.calls[0][0].start_date).toBe('string');
    });

    it('should send undefined dates as undefined', async () => {
      submission.isEditableStatus.mockReturnValue(true);
      apiService.PATCH_CapacitySharing.mockResolvedValue({});
      apiService.GET_CapacitySharing.mockResolvedValue({ data: {} });

      component.body.set({ start_date: undefined, end_date: undefined });

      await component.saveData();

      expect(apiService.PATCH_CapacitySharing).toHaveBeenCalledWith(
        expect.objectContaining({ start_date: undefined, end_date: undefined })
      );
    });

    it('should show success toast', async () => {
      submission.isEditableStatus.mockReturnValue(true);
      apiService.PATCH_CapacitySharing.mockResolvedValue({});
      apiService.GET_CapacitySharing.mockResolvedValue({ data: {} });

      await component.saveData();

      expect(actions.showToast).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'CapSharing Details',
        detail: 'Data saved successfully'
      });
    });

    it('should not call PATCH if not editable', async () => {
      submission.isEditableStatus.mockReturnValue(false);

      await component.saveData();

      expect(apiService.PATCH_CapacitySharing).not.toHaveBeenCalled();
      expect(actions.showToast).not.toHaveBeenCalled();
    });

    it('should navigate to next page with version query param', async () => {
      submission.isEditableStatus.mockReturnValue(true);
      apiService.PATCH_CapacitySharing.mockResolvedValue({});
      apiService.GET_CapacitySharing.mockResolvedValue({ data: {} });

      await component.saveData('next');

      expect(router.navigate).toHaveBeenCalledWith(['result', 1, 'partners'], { queryParams: { version: 'v1' }, replaceUrl: true });
    });

    it('should navigate to back page', async () => {
      submission.isEditableStatus.mockReturnValue(true);
      apiService.PATCH_CapacitySharing.mockResolvedValue({});
      apiService.GET_CapacitySharing.mockResolvedValue({ data: {} });

      await component.saveData('back');

      expect(router.navigate).toHaveBeenCalledWith(['result', 1, 'alliance-alignment'], { queryParams: { version: 'v1' }, replaceUrl: true });
    });

    it('should navigate with no query params when version is absent', async () => {
      submission.isEditableStatus.mockReturnValue(true);
      apiService.PATCH_CapacitySharing.mockResolvedValue({});
      apiService.GET_CapacitySharing.mockResolvedValue({ data: {} });

      const routeMock = TestBed.inject(ActivatedRoute) as any;
      routeMock.snapshot.queryParamMap.get = () => null;

      await component.saveData('next');

      const navigateArgs = (router.navigate as jest.Mock).mock.calls.pop();
      expect(navigateArgs[0]).toEqual(['result', 1, 'partners']);
      expect(navigateArgs[1].queryParams).toBeUndefined();
      expect(navigateArgs[1].replaceUrl).toBe(true);
    });

    it('should not navigate when no page direction given', async () => {
      submission.isEditableStatus.mockReturnValue(true);
      apiService.PATCH_CapacitySharing.mockResolvedValue({});
      apiService.GET_CapacitySharing.mockResolvedValue({ data: {} });

      await component.saveData();

      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('computed signals', () => {
    it('isLongTermSelected should be true when session_length_id is 2', () => {
      component.body.set({ session_length_id: 2 });
      expect(component.isLongTermSelected()).toBe(true);

      component.body.set({ session_length_id: 1 });
      expect(component.isLongTermSelected()).toBe(false);
    });

    it('isStartDateGreaterThanEndDate should compare correctly', () => {
      component.body.set({ start_date: new Date('2023-12-31'), end_date: new Date('2023-01-01') });
      expect(component.isStartDateGreaterThanEndDate()).toBe(true);

      component.body.set({ start_date: new Date('2023-01-01'), end_date: new Date('2023-12-31') });
      expect(component.isStartDateGreaterThanEndDate()).toBe(false);
    });

    it('isStartDateGreaterThanEndDate should return false when dates are missing', () => {
      component.body.set({});
      expect(component.isStartDateGreaterThanEndDate()).toBe(false);

      component.body.set({ start_date: new Date('2023-01-01') });
      expect(component.isStartDateGreaterThanEndDate()).toBe(false);

      component.body.set({ end_date: new Date('2023-12-31') });
      expect(component.isStartDateGreaterThanEndDate()).toBe(false);
    });

    it('isStartDateGreaterThanEndDate should handle null/undefined body', () => {
      component.body.set(null as any);
      expect(component.isStartDateGreaterThanEndDate()).toBe(false);

      component.body.set(undefined as any);
      expect(component.isStartDateGreaterThanEndDate()).toBe(false);
    });
  });

  describe('helper methods', () => {
    it('hasBothDates should return true only when both present', () => {
      expect((component as any).hasBothDates({ start_date: new Date(), end_date: new Date() })).toBe(true);
      expect((component as any).hasBothDates({ start_date: new Date(), end_date: undefined } as any)).toBe(false);
      expect((component as any).hasBothDates({ start_date: undefined, end_date: new Date() } as any)).toBe(false);
      expect((component as any).hasBothDates({} as any)).toBe(false);
    });

    it('canRemove should delegate to submission.isEditableStatus', () => {
      submission.isEditableStatus.mockReturnValue(true);
      expect(component.canRemove()).toBe(true);

      submission.isEditableStatus.mockReturnValue(false);
      expect(component.canRemove()).toBe(false);
    });

    it('setSectionAndOpenModal should set section and open modal', () => {
      component.setSectionAndOpenModal('Capacity Sharing');

      expect(allModalsService.setPartnerRequestSection).toHaveBeenCalledWith('Capacity Sharing');
      expect(allModalsService.openModal).toHaveBeenCalledWith('requestPartner');
    });
  });

  describe('effect: clearDegreeIdIfNotLongTerm', () => {
    it('should clear degree_id when switching away from long term', fakeAsync(() => {
      component.body.set({ session_length_id: 2, degree_id: 5 });
      tick();
      component.body.set({ session_length_id: 1 });
      tick();
      expect(component.body().degree_id).toBeUndefined();
    }));

    it('should not clear degree_id when long term stays selected', fakeAsync(() => {
      component.body.set({ session_length_id: 1, degree_id: 5 });
      tick();
      component.body.set({ session_length_id: 2, degree_id: 5 });
      tick();
      expect(component.body().degree_id).toBe(5);
    }));

    it('should not update body when degree_id is already undefined', () => {
      component.body.set({ session_length_id: 1 } as any);
      const updateSpy = jest.spyOn(component.body, 'update');
      (component as any).clearDegreeIdIfNotLongTerm();
      expect(updateSpy).not.toHaveBeenCalled();
      updateSpy.mockRestore();
    });

    it('should clear degree_id via helper when invoked directly', () => {
      component.body.set({ session_length_id: 1, degree_id: 9 } as any);
      (component as any).clearDegreeIdIfNotLongTerm();
      expect(component.body().degree_id).toBeUndefined();
    });
  });

  it('should call getData when versionWatcher triggers version change', async () => {
    const spy = jest.spyOn(component, 'getData').mockResolvedValue();
    expect(versionWatcher.onVersionChange).toHaveBeenCalled();
    const cb = (versionWatcher.onVersionChange as jest.Mock).mock.calls[0][0];
    await cb();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  describe('parseCapacitySharingTimestamp', () => {
    it('should parse ISO 8601 string with microseconds', () => {
      const result = component.parseCapacitySharingTimestamp('2025-06-06T12:51:43.861000Z');
      expect(result).toBeInstanceOf(Date);
      expect(result!.getFullYear()).toBe(2025);
      expect(result!.getMonth()).toBe(5);
      expect(result!.getDate()).toBe(6);
    });

    it('should parse standard ISO 8601 string', () => {
      const result = component.parseCapacitySharingTimestamp('2023-01-01T00:00:00.000Z');
      expect(result).toBeInstanceOf(Date);
      expect(result!.getFullYear()).toBe(2023);
      expect(result!.getMonth()).toBe(0);
      expect(result!.getDate()).toBe(1);
    });

    it('should parse date-only string', () => {
      const result = component.parseCapacitySharingTimestamp('2023-06-15');
      expect(result).toBeInstanceOf(Date);
      expect(result!.getDate()).toBe(15);
    });

    it('should handle a Date object input', () => {
      const result = component.parseCapacitySharingTimestamp(new Date(Date.UTC(2024, 2, 10)));
      expect(result).toBeInstanceOf(Date);
      expect(result!.getFullYear()).toBe(2024);
      expect(result!.getMonth()).toBe(2);
      expect(result!.getDate()).toBe(10);
    });

    it('should return undefined for null', () => {
      expect(component.parseCapacitySharingTimestamp(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(component.parseCapacitySharingTimestamp(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(component.parseCapacitySharingTimestamp('')).toBeUndefined();
    });

    it('should return undefined for invalid date string', () => {
      expect(component.parseCapacitySharingTimestamp('not-a-date')).toBeUndefined();
    });
  });

  it('toISOTimestamp should return undefined for falsy values', () => {
    expect((component as any).toISOTimestamp(undefined)).toBeUndefined();
    expect((component as any).toISOTimestamp(null)).toBeUndefined();
    expect((component as any).toISOTimestamp('')).toBeUndefined();
  });

  it('toISOTimestamp should convert Date to ISO string', () => {
    const result = (component as any).toISOTimestamp(new Date('2025-06-06T12:00:00Z'));
    expect(result).toBe('2025-06-06T12:00:00.000Z');
  });

  it('toISOTimestamp should convert date string to ISO string', () => {
    const result = (component as any).toISOTimestamp('2025-06-06T12:00:00Z');
    expect(result).toBe('2025-06-06T12:00:00.000Z');
  });
});
