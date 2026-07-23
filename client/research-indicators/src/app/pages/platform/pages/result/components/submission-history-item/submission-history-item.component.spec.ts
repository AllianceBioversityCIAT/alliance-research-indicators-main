import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { SubmissionHistoryItemComponent } from './submission-history-item.component';
import { ApiService } from '@shared/services/api.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { SubmissionService } from '@shared/services/submission.service';
import { ActionsService } from '@shared/services/actions.service';
import { RolesService } from '@shared/services/cache/roles.service';
import { DateFormatConfigService } from '@shared/services/date-format-config.service';
import { SubmissionHistoryItem } from '@shared/interfaces/submission-history-item.interface';
import * as dateFormatUtil from '@shared/utils/date-format.util';

const defaultHistoryItem: SubmissionHistoryItem = {
  created_by_object: { first_name: 'Test', last_name: 'User' },
  from_status_id: 1,
  to_status_id: 2,
  from_status: { name: 'A', config: { color: {}, icon: {} } } as any,
  to_status: { name: 'B', config: { color: {}, icon: {} } } as any,
  updated_at: '2026-02-02T12:00:00.000Z',
  submission_comment: '',
  custom_date: '',
  submission_history_id: 100
};

describe('SubmissionHistoryItemComponent', () => {
  let component: SubmissionHistoryItemComponent;
  let fixture: ComponentFixture<SubmissionHistoryItemComponent>;
  let mockApiService: jest.Mocked<Pick<ApiService, 'PATCH_StatusChangeDate'>>;
  let mockCacheService: {
    currentMetadata: ReturnType<typeof signal>;
    editStatusDateOpenId: ReturnType<typeof signal<number | null>>;
    getCurrentNumericResultId: () => number;
  };
  let mockRolesService: { isAdmin: jest.Mock };
  let mockDateFormatConfigService: { config: ReturnType<typeof signal> };
  let mockActionsService: { showToast: jest.Mock };

  beforeEach(async () => {
    mockApiService = {
      PATCH_StatusChangeDate: jest.fn().mockResolvedValue({ successfulRequest: true })
    };
    const editStatusDateOpenIdSignal = signal<number | null>(null);
    mockCacheService = {
      currentMetadata: signal({ indicator_id: 1 }),
      editStatusDateOpenId: editStatusDateOpenIdSignal,
      getCurrentNumericResultId: () => 12345
    };
    const refreshSignal = signal(0);
    const mockSubmissionService = {
      refreshSubmissionHistory: refreshSignal
    };
    mockActionsService = {
      showToast: jest.fn()
    };
    mockRolesService = {
      isAdmin: jest.fn().mockReturnValue(true)
    };
    mockDateFormatConfigService = {
      config: signal(null)
    };

    await TestBed.configureTestingModule({
      imports: [SubmissionHistoryItemComponent],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: SubmissionService, useValue: mockSubmissionService },
        { provide: ActionsService, useValue: mockActionsService },
        { provide: RolesService, useValue: mockRolesService },
        { provide: DateFormatConfigService, useValue: mockDateFormatConfigService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SubmissionHistoryItemComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('historyItem', { ...defaultHistoryItem });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('computed and inputs', () => {
    it('should compute submissionHistoryId from submission_history_id', () => {
      expect(component.submissionHistoryId()).toBe(100);
    });

    it('should compute submissionHistoryId from id when submission_history_id is missing', () => {
      fixture.componentRef.setInput('historyItem', {
        ...defaultHistoryItem,
        submission_history_id: undefined,
        id: 99
      } as SubmissionHistoryItem & { id?: number });
      fixture.detectChanges();
      expect(component.submissionHistoryId()).toBe(99);
    });

    it('should show edit when is_editable_date and admin', () => {
      mockRolesService.isAdmin.mockReturnValue(true);
      fixture.componentRef.setInput('historyItem', {
        ...defaultHistoryItem,
        is_editable_date: true
      });
      fixture.detectChanges();
      expect(component.showCustomDateAndEdit()).toBe(true);
    });

    it('should not show edit when not admin', () => {
      mockRolesService.isAdmin.mockReturnValue(false);
      fixture.componentRef.setInput('historyItem', { ...defaultHistoryItem, is_editable_date: true });
      fixture.detectChanges();
      expect(component.showCustomDateAndEdit()).toBe(false);
    });

    it('should compute editTimezoneLabel with editDate undefined', () => {
      expect(component.editDate()).toBeNull();
      expect(component.editTimezoneLabel()).toBeDefined();
    });

    it('should compute editCalendarFormats', () => {
      expect(component.editCalendarFormats()).toBeDefined();
    });

    it('should compute isEditPanelVisible true when modal open, panelStyle set and openId matches', () => {
      const rect = { bottom: 100, left: 50, top: 0, right: 0, width: 50, height: 30, x: 0, y: 0, toJSON: () => ({}) };
      component.openEditModal({ currentTarget: { getBoundingClientRect: () => rect } } as unknown as Event);
      expect(component.isEditPanelVisible()).toBe(true);
    });

    it('should compute isEditPanelVisible false when modal closed', () => {
      expect(component.isEditPanelVisible()).toBe(false);
    });
  });

  describe('openEditModal', () => {
    it('should return early when submissionHistoryId is null', () => {
      fixture.componentRef.setInput('historyItem', {
        ...defaultHistoryItem,
        submission_history_id: undefined
      } as SubmissionHistoryItem & { id?: number });
      fixture.detectChanges();
      component.openEditModal();
      expect(component.showEditModal()).toBe(false);
      expect(mockCacheService.editStatusDateOpenId()).toBeNull();
    });

    it('should set cache open id and open modal when id is present', () => {
      component.openEditModal();
      expect(mockCacheService.editStatusDateOpenId()).toBe(100);
      expect(component.showEditModal()).toBe(true);
      expect(component.editDate()).not.toBeNull();
      expect(component.editTime()).not.toBeNull();
    });

    it('should use custom_date as source when showCustomDateAndEdit and custom_date set', () => {
      fixture.componentRef.setInput('historyItem', {
        ...defaultHistoryItem,
        is_editable_date: true,
        custom_date: '2026-03-01T10:00:00.000Z'
      });
      fixture.detectChanges();
      component.openEditModal();
      expect(component.showEditModal()).toBe(true);
    });

    it('should use updated_at as source when custom_date is empty (cover line 88-90 branch)', () => {
      fixture.componentRef.setInput('historyItem', {
        ...defaultHistoryItem,
        is_editable_date: true,
        custom_date: ''
      });
      fixture.detectChanges();
      component.openEditModal();
      expect(component.showEditModal()).toBe(true);
      expect(component.editDate()).not.toBeNull();
    });

    it('should use updated_at as source when showCustomDateAndEdit is false', () => {
      mockRolesService.isAdmin.mockReturnValue(false);
      fixture.componentRef.setInput('historyItem', { ...defaultHistoryItem });
      fixture.detectChanges();
      component.openEditModal();
      expect(component.showEditModal()).toBe(true);
    });

    it('should use new Date() when source is falsy (cover raw ternary branch)', () => {
      fixture.componentRef.setInput('historyItem', {
        ...defaultHistoryItem,
        updated_at: '',
        custom_date: ''
      });
      fixture.detectChanges();
      component.openEditModal();
      expect(component.showEditModal()).toBe(true);
      expect(component.editDate()).not.toBeNull();
    });

    it('should set panelStyle when event has currentTarget with getBoundingClientRect', () => {
      const rect = { bottom: 200, left: 100, top: 0, right: 0, width: 50, height: 30, x: 0, y: 0, toJSON: () => ({}) };
      const btn = { getBoundingClientRect: () => rect };
      component.openEditModal({ currentTarget: btn } as unknown as Event);
      expect(component.panelStyle()).not.toBeNull();
      expect(component.panelStyle()?.top).toContain('204');
      expect(component.panelStyle()?.left).toBe('0px'); // 100 - 180 = -80 -> max(0, -80) = 0
    });

    it('should set panelStyle to null when no rect', () => {
      component.openEditModal({ currentTarget: null } as unknown as Event);
      expect(component.panelStyle()).toBeNull();
      expect(component.showEditModal()).toBe(true);
    });

    it('should use UTC path when config is not CET/CEST', () => {
      mockDateFormatConfigService.config.set({
        timezone: { iana: 'America/New_York', displayName: 'EST', abbreviationMode: 'short' },
        locale: 'en',
        date: {} as any,
        time: {} as any,
        display: {} as any
      });
      fixture.detectChanges();
      component.openEditModal();
      expect(component.showEditModal()).toBe(true);
    });

    it('should set editDate and editTime from getLocalDateAndTime when config is CET', () => {
      mockDateFormatConfigService.config.set({
        timezone: { iana: 'Europe/Paris', displayName: 'CET', abbreviationMode: 'short' },
        locale: 'en',
        date: {} as any,
        time: {} as any,
        display: {} as any
      });
      fixture.detectChanges();
      component.openEditModal();
      expect(component.editDate()).not.toBeNull();
      expect(component.editTime()).not.toBeNull();
      expect(component.showEditModal()).toBe(true);
    });

    it('should use local date fallback when getLocalDateAndTime returns null', () => {
      jest.spyOn(dateFormatUtil, 'isConfigCetCest').mockReturnValue(true);
      jest.spyOn(dateFormatUtil, 'getLocalDateAndTime').mockReturnValue(null);
      fixture.componentRef.setInput('historyItem', {
        ...defaultHistoryItem,
        updated_at: 'invalid-date'
      });
      fixture.detectChanges();
      component.openEditModal();
      expect(component.editDate()).not.toBeNull();
      expect(component.editTime()).not.toBeNull();
    });

    it('should use UTC fallback when getUtcDateAndTime returns null', () => {
      jest.spyOn(dateFormatUtil, 'isConfigCetCest').mockReturnValue(false);
      jest.spyOn(dateFormatUtil, 'getUtcDateAndTime').mockReturnValue(null);
      fixture.componentRef.setInput('historyItem', {
        ...defaultHistoryItem,
        updated_at: 'invalid-date'
      });
      fixture.detectChanges();
      component.openEditModal();
      expect(component.editDate()).not.toBeNull();
      expect(component.editTime()).not.toBeNull();
    });
  });

  describe('closeEditModal', () => {
    it('should close modal and clear cache', () => {
      component.openEditModal();
      expect(component.showEditModal()).toBe(true);
      component.closeEditModal();
      expect(component.showEditModal()).toBe(false);
      expect(component.panelStyle()).toBeNull();
      expect(mockCacheService.editStatusDateOpenId()).toBeNull();
    });
  });

  describe('scrollCloseHandler', () => {
    it('should close modal when scroll and open id matches', () => {
      component.openEditModal();
      mockCacheService.editStatusDateOpenId.set(100);
      const closeSpy = jest.spyOn(component, 'closeEditModal');
      (component as any).scrollCloseHandler();
      expect(closeSpy).toHaveBeenCalled();
    });

    it('should not close modal when open id does not match', () => {
      component.openEditModal();
      mockCacheService.editStatusDateOpenId.set(999);
      const closeSpy = jest.spyOn(component, 'closeEditModal');
      (component as any).scrollCloseHandler();
      expect(closeSpy).not.toHaveBeenCalled();
    });
  });

  describe('closeWhenOtherOpens effect', () => {
    it('should close modal when another item opens', () => {
      component.openEditModal();
      expect(component.showEditModal()).toBe(true);
      mockCacheService.editStatusDateOpenId.set(200);
      fixture.detectChanges();
      TestBed.flushEffects();
      expect(component.showEditModal()).toBe(false);
      expect(component.panelStyle()).toBeNull();
    });
  });

  describe('confirmEdit', () => {
    it('should return early when date or time or id or resultCode missing', async () => {
      component.editDate.set(null);
      component.editTime.set(new Date());
      await component.confirmEdit();
      expect(mockApiService.PATCH_StatusChangeDate).not.toHaveBeenCalled();

      component.editDate.set(new Date());
      component.editTime.set(null);
      await component.confirmEdit();
      expect(mockApiService.PATCH_StatusChangeDate).not.toHaveBeenCalled();
    });

    it('should return early when getCurrentNumericResultId returns null', async () => {
      mockCacheService.getCurrentNumericResultId = () => null as any;
      component.openEditModal();
      await component.confirmEdit();
      expect(mockApiService.PATCH_StatusChangeDate).not.toHaveBeenCalled();
    });

    it('should PATCH and close on success', async () => {
      component.openEditModal();
      await component.confirmEdit();
      expect(mockApiService.PATCH_StatusChangeDate).toHaveBeenCalledWith(12345, 100, expect.any(String));
      expect(mockActionsService.showToast).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Date updated',
        detail: 'Status change date has been updated.'
      });
      expect(component.showEditModal()).toBe(false);
    });

    it('should show toast with errorDetail.errors on API error', async () => {
      mockApiService.PATCH_StatusChangeDate.mockRejectedValueOnce({
        errorDetail: { errors: 'Validation failed' }
      });
      component.openEditModal();
      await component.confirmEdit();
      expect(mockActionsService.showToast).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Validation failed'
      });
    });

    it('should show toast with default detail when error has no errorDetail', async () => {
      mockApiService.PATCH_StatusChangeDate.mockRejectedValueOnce(new Error('Network error'));
      component.openEditModal();
      await component.confirmEdit();
      expect(mockActionsService.showToast).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update date.'
      });
    });

    it('should set saving to false in finally', async () => {
      mockApiService.PATCH_StatusChangeDate.mockRejectedValueOnce(new Error('err'));
      component.openEditModal();
      await component.confirmEdit();
      expect(component.saving()).toBe(false);
    });
  });

  describe('ngOnDestroy', () => {
    it('should remove scroll listener on destroy', () => {
      const removeSpy = jest.spyOn(window, 'removeEventListener');
      component.openEditModal();
      removeSpy.mockClear();
      component.ngOnDestroy();
      expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
    });
  });
});
