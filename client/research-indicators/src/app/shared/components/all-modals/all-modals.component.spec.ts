import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AllModalsComponent } from './all-modals.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { SubmissionService } from '@shared/services/submission.service';
import { CreateResultManagementService } from './modals-content/create-result-modal/services/create-result-management.service';

describe('AllModalsComponent', () => {
  let component: AllModalsComponent;
  let fixture: ComponentFixture<AllModalsComponent>;

  beforeEach(async () => {
    (globalThis as any).ResizeObserver = class {
      observe() {
        // intentionally left blank for testing
      }
      unobserve() {
        // intentionally left blank for testing
      }
      disconnect() {
        // intentionally left blank for testing
      }
    };
    const mockSubmissionService = {
      statusSelected: signal({
        key: 'submitted',
        label: 'Submitted',
        description: 'The result has been submitted',
        icon: 'pi pi-check',
        color: 'success',
        message: 'The result was submitted successfully.',
        statusId: 1,
        selected: true
      }),
      comment: signal('')
    };
    const resultPageStepMock: any = Object.assign(jest.fn().mockReturnValue(0), { set: jest.fn() });
    const currentRequestedResultCodeMock: any = Object.assign(jest.fn().mockReturnValue(null), { set: jest.fn() });
    const editingOicrMock: any = Object.assign(jest.fn().mockReturnValue(false), { set: jest.fn() });
    const clearOicrBodyMock: any = jest.fn();
    const presetFromProjectResultsTableMock: any = jest.fn().mockReturnValue(false);
    const contractIdMock: any = jest.fn().mockReturnValue(null);
    const mockCreateResultManagementService: Partial<CreateResultManagementService> = {
      resultPageStep: resultPageStepMock,
      currentRequestedResultCode: currentRequestedResultCodeMock,
      editingOicr: editingOicrMock,
      clearOicrBody: clearOicrBodyMock,
      presetFromProjectResultsTable: presetFromProjectResultsTableMock,
      contractId: contractIdMock
    } as any;
    
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, AllModalsComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: new Map() },
            params: of({}) // Mock route parameters if needed
          }
        },
        {
          provide: SubmissionService,
          useValue: mockSubmissionService
        },
        {
          provide: CreateResultManagementService,
          useValue: mockCreateResultManagementService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AllModalsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('disabledConfirmIf', () => {
    it('should be true when statusSelected is undefined', () => {
      const service = TestBed.inject(SubmissionService) as any;
      service.statusSelected.set(undefined);
      expect(component.disabledConfirmIf()).toBe(true);
    });

    it('should be true when statusSelected.statusId is falsy', () => {
      const service = TestBed.inject(SubmissionService) as any;
      service.statusSelected.set({ statusId: 0 });
      expect(component.disabledConfirmIf()).toBe(true);
    });

    it('should be true for statusId 5 when comment is empty', () => {
      const service = TestBed.inject(SubmissionService) as any;
      service.statusSelected.set({ statusId: 5 });
      service.comment.set('');
      expect(component.disabledConfirmIf()).toBe(true);
    });

    it('should be false for statusId 6 regardless of comment', () => {
      const service = TestBed.inject(SubmissionService) as any;
      service.statusSelected.set({ statusId: 6 });
      service.comment.set('');
      expect(component.disabledConfirmIf()).toBe(false);
      service.comment.set('some text');
      expect(component.disabledConfirmIf()).toBe(false);
    });

    it('should be true for statusId 7 when comment is empty and false when not', () => {
      const service = TestBed.inject(SubmissionService) as any;
      service.statusSelected.set({ statusId: 7 });
      service.comment.set('');
      expect(component.disabledConfirmIf()).toBe(true);
      service.comment.set('Has comment');
      expect(component.disabledConfirmIf()).toBe(false);
    });

    it('should be true for any other statusId', () => {
      const service = TestBed.inject(SubmissionService) as any;
      service.statusSelected.set({ statusId: 99 });
      expect(component.disabledConfirmIf()).toBe(true);
    });
  });

  describe('clearModal', () => {
    it('should reset create result state synchronously and step after delay', fakeAsync(() => {
      const service = TestBed.inject(CreateResultManagementService) as any;
      component.clearModal();
      expect(service.currentRequestedResultCode.set).toHaveBeenCalledWith(null);
      expect(service.editingOicr.set).toHaveBeenCalledWith(false);
      expect(service.clearOicrBody).toHaveBeenCalled();
      tick(300);
      expect(service.resultPageStep.set).toHaveBeenCalledWith(0);
    }));
  });
});
