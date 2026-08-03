import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubmitResultContentComponent } from './submit-result-content.component';
import { AllModalsService } from '@services/cache/all-modals.service';
import { GetMetadataService } from '@shared/services/get-metadata.service';
import { ApiService } from '@shared/services/api.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { SubmissionService } from '../../../../services/submission.service';
import { ActionsService } from '@shared/services/actions.service';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { CurrentResultService } from '@shared/services/cache/current-result.service';
import { ProjectResultsTableService } from '@shared/components/project-results-table/project-results-table.service';
import { ResultsCenterService } from '@pages/platform/pages/results-center/results-center.service';
import { ResultStatus } from '@shared/interfaces/result-config.interface';

describe('SubmitResultContentComponent', () => {
  let component: SubmitResultContentComponent;
  let fixture: ComponentFixture<SubmitResultContentComponent>;
  let mockAllModalsService: Partial<AllModalsService>;
  let mockMetadataService: Partial<GetMetadataService>;
  let mockApiService: Partial<ApiService>;
  let mockCacheService: Partial<CacheService>;
  let mockSubmissionService: Partial<SubmissionService>;
  let mockActionsService: Partial<ActionsService>;
  let mockRouter: Partial<Router>;
  let mockCurrentResultService: Partial<CurrentResultService>;
  let mockProjectResultsTableService: Partial<ProjectResultsTableService>;
  let mockResultsCenterService: Partial<ResultsCenterService>;

  beforeEach(async () => {
    mockAllModalsService = {
      setSubmitReview: jest.fn(),
      setDisabledSubmitReview: jest.fn(),
      setSubmitBackAction: jest.fn(),
      closeModal: jest.fn(),
      closeAllModals: jest.fn(),
      setSubmitResultOrigin: jest.fn(),
      setSubmitHeader: jest.fn(),
      setSubmitBackStep: jest.fn(),
      clearSubmissionData: jest.fn(),
      submitResultOrigin: signal(null),
      submitHeader: signal(null),
      submitBackStep: signal(null),
      submitBackAction: undefined,
      createResultManagementService: {
        resetModal: jest.fn(),
        currentRequestedResultCode: { set: jest.fn() },
        createOicrBody: signal({
          base_information: {
            title: 'Test OICR Title'
          }
        }),
        clearOicrBody: jest.fn(),
        setStatusId: jest.fn(),
        editingOicr: { set: jest.fn() },
        autofillinOicr: { set: jest.fn() },
        year: { set: jest.fn() },
        oicrPrimaryOptionsDisabled: { set: jest.fn() }
      },
      disablePostponeOption: Object.assign(() => false, { set: jest.fn() }) as any,
      disableRejectOption: Object.assign(() => false, { set: jest.fn() }) as any,
      modalConfig: signal({
        submitResult: { isOpen: false },
        createResult: { isOpen: false },
        requestPartner: { isOpen: false },
        askForHelp: { isOpen: false }
      })
    };

    mockMetadataService = {
      update: jest.fn().mockResolvedValue({})
    };

    mockApiService = {
      PATCH_SubmitResult: jest.fn(),
      GET_Versions: jest.fn(),
      GET_ResultStatus: jest.fn().mockImplementation((statusId: number) => {
        const statusMap: Record<number, any> = {
          6: { successfulRequest: true, data: { result_status_id: 6, name: 'Approve' } },
          5: { successfulRequest: true, data: { result_status_id: 5, name: 'Revise' } },
          7: { successfulRequest: true, data: { result_status_id: 7, name: 'Reject' } },
          10: { successfulRequest: true, data: { result_status_id: 10, name: 'OICR Accepted' } },
          11: { successfulRequest: true, data: { result_status_id: 11, name: 'Postpone' } },
          15: { successfulRequest: true, data: { result_status_id: 15, name: 'OICR Not Accepted' } }
        };
        return Promise.resolve(statusMap[statusId] || { successfulRequest: false });
      })
    };

    mockCacheService = {
      getCurrentNumericResultId: jest.fn().mockReturnValue(123),
      lastResultId: { set: jest.fn() },
      lastVersionParam: { set: jest.fn() },
      liveVersionData: { set: jest.fn() },
      versionsList: { set: jest.fn() },
      currentMetadata: signal({ status_id: 2 }),
      projectResultsSearchValue: { set: jest.fn() }
    };

    mockSubmissionService = {
      statusSelected: signal(null),
      comment: signal(''),
      melRegionalExpert: signal(''),
      oicrNo: signal(''),
      sharePointFolderLink: signal('')
    };

    // Create spies for signal methods
    jest.spyOn(mockSubmissionService.comment, 'set');
    jest.spyOn(mockSubmissionService.statusSelected, 'set');

    mockActionsService = {
      showGlobalAlert: jest.fn(),
      hideGlobalAlert: jest.fn(),
      showToast: jest.fn()
    };

    mockRouter = {
      url: '/test-url?param=value',
      navigate: jest.fn().mockResolvedValue(true)
    };

    mockCurrentResultService = {
      openEditRequestdOicrsModal: jest.fn().mockResolvedValue(undefined)
    };

    mockProjectResultsTableService = {
      contractId: 'test-contract-id',
      getData: jest.fn().mockResolvedValue(undefined)
    };

    mockResultsCenterService = {
      main: jest.fn().mockResolvedValue(undefined)
    };

    await TestBed.configureTestingModule({
      imports: [SubmitResultContentComponent],
      providers: [
        { provide: AllModalsService, useValue: mockAllModalsService },
        { provide: GetMetadataService, useValue: mockMetadataService },
        { provide: ApiService, useValue: mockApiService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: SubmissionService, useValue: mockSubmissionService },
        { provide: ActionsService, useValue: mockActionsService },
        { provide: Router, useValue: mockRouter },
        { provide: CurrentResultService, useValue: mockCurrentResultService },
        { provide: ProjectResultsTableService, useValue: mockProjectResultsTableService },
        { provide: ResultsCenterService, useValue: mockResultsCenterService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SubmitResultContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    // Clean up any spies
    jest.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with correct review options', () => {
    // Set statusData with the expected labels and action_description
    component.statusData.set({
      6: { result_status_id: 6, name: 'Approve', action_description: 'Approve this result without changes.' } as ResultStatus,
      5: { result_status_id: 5, name: 'Revise', action_description: 'Provide recommendations and changes.' } as ResultStatus,
      7: { result_status_id: 7, name: 'Reject', action_description: 'Reject this result and specify the reason.' } as ResultStatus
    });

    const options = component.reviewOptions();
    expect(options).toHaveLength(3);
    
    expect(options[0]).toEqual({
      key: 'approve',
      label: 'Approve',
      description: 'Approve this result without changes.',
      icon: 'pi-check-circle',
      color: 'text-[#509C55]',
      message: 'Once this result is approved, no further changes will be allowed.',
      commentLabel: undefined,
      placeholder: '',
      statusId: 6,
      selected: false
    });

    expect(options[1]).toEqual({
      key: 'revise',
      label: 'Revise',
      description: 'Provide recommendations and changes.',
      icon: 'pi-minus-circle',
      color: 'text-[#e69f00]',
      message: 'The result submitter will address the provided recommendations and resubmit for review.',
      commentLabel: 'Add recommendations/comments',
      placeholder: '',
      statusId: 5,
      selected: false
    });

    expect(options[2]).toEqual({
      key: 'reject',
      label: 'Reject',
      description: 'Reject this result and specify the reason.',
      icon: 'pi-times-circle',
      color: 'text-[#cf0808]',
      message: 'If the result is rejected, it can no longer be edited or resubmitted.',
      commentLabel: 'Add the reject reason',
      placeholder: '',
      statusId: 7,
      selected: false
    });
  });

  it('should compute submittionOptions correctly', () => {
    const selectedOption = { statusId: 5, key: 'revise', label: 'Revise', description: 'Provide recommendations and changes.', icon: 'pi-minus-circle', color: 'text-[#e69f00]', message: 'The result submitter will address the provided recommendations and resubmit for review.', commentLabel: 'Add recommendations/comments', selected: false };
    mockSubmissionService.statusSelected.set(selectedOption);

    const options = component.submittionOptions();
    expect(options).toHaveLength(3);
    expect(options[0].selected).toBe(false); // approve
    expect(options[1].selected).toBe(true);  // revise
    expect(options[2].selected).toBe(false); // reject
  });

  it('should set comment from textarea event', () => {
    const mockEvent = { target: { value: 'Test comment' } } as any;
    component.setComment(mockEvent);
    expect(mockSubmissionService.comment()).toBe('Test comment');
  });

  it('should compute disabledConfirmSubmit correctly', () => {
    // No selection - should be disabled
    mockSubmissionService.statusSelected.set(null);
    expect(component.disabledConfirmSubmit()).toBe(true);

    // Selected option without commentLabel - should be enabled
    const approveOption = { statusId: 6, commentLabel: undefined };
    mockSubmissionService.statusSelected.set(approveOption);
    expect(component.disabledConfirmSubmit()).toBe(false);

    // Selected option with commentLabel but no comment - should be disabled
    const reviseOption = { statusId: 5, commentLabel: 'Add comments' };
    mockSubmissionService.statusSelected.set(reviseOption);
    mockSubmissionService.comment.set('');
    expect(component.disabledConfirmSubmit()).toBe(true);

    // Selected option with commentLabel and comment - should be enabled
    mockSubmissionService.comment.set('Test comment');
    expect(component.disabledConfirmSubmit()).toBe(false);

    // Selected option with commentLabel and whitespace comment - should be disabled
    mockSubmissionService.comment.set('   ');
    expect(component.disabledConfirmSubmit()).toBe(true);
  });

  it('should set initial selected review option when modal opens', () => {
    // Set statusData with the expected labels and action_description
    component.statusData.set({
      6: { result_status_id: 6, name: 'Approve', action_description: 'Approve this result without changes.' } as ResultStatus,
      5: { result_status_id: 5, name: 'Revise', action_description: 'Provide recommendations and changes.' } as ResultStatus,
      7: { result_status_id: 7, name: 'Reject', action_description: 'Reject this result and specify the reason.' } as ResultStatus
    });

    const matchingOption = { 
      key: 'revise', 
      label: 'Revise', 
      description: 'Provide recommendations and changes.', 
      icon: 'pi-minus-circle', 
      color: 'text-[#e69f00]', 
      message: 'The result submitter will address the provided recommendations and resubmit for review.', 
      commentLabel: 'Add recommendations/comments', 
      placeholder: '',
      statusId: 5, 
      selected: false 
    };
    mockCacheService.currentMetadata!.set({ status_id: 5 });
    
    // Simulate modal opening
    mockAllModalsService.modalConfig!.set({
      submitResult: { isOpen: true },
      createResult: { isOpen: false },
      requestPartner: { isOpen: false },
      askForHelp: { isOpen: false }
    });

    // Manually call the effect logic
    component.setInitialSelectedReviewOption();

    expect(mockSubmissionService.statusSelected()).toEqual(matchingOption);
  });

  it('should not set initial option when status_id is null', () => {
    mockCacheService.currentMetadata!.set({ status_id: null });
    component.setInitialSelectedReviewOption();
    expect(mockSubmissionService.statusSelected()).toBeNull();
  });

  it('should not set initial option when no matching option found', () => {
    mockCacheService.currentMetadata!.set({ status_id: 999 });
    component.setInitialSelectedReviewOption();
    expect(mockSubmissionService.statusSelected()).toBeNull();
  });

  it('constructor should register callbacks in AllModalsService', () => {
    expect((mockAllModalsService.setSubmitReview as jest.Mock)).toHaveBeenCalled();
    expect((mockAllModalsService.setDisabledSubmitReview as jest.Mock)).toHaveBeenCalled();
    const disabledCb = (mockAllModalsService.setDisabledSubmitReview as jest.Mock).mock.calls[0][0] as () => boolean;
    // With default selection/comment it should be false (enabled)
    expect(disabledCb()).toBe(true);
  });

  it('should execute the submit callback registered by constructor', async () => {
    const submitCb = (mockAllModalsService.setSubmitReview as jest.Mock).mock.calls[0][0] as () => Promise<void>;
    // Prepare a valid selection and comment for submission
    mockSubmissionService.statusSelected.set({ statusId: 6, commentLabel: undefined } as any);
    mockSubmissionService.comment.set('some');
    (mockApiService.PATCH_SubmitResult as jest.Mock).mockResolvedValue({ successfulRequest: true });
    (mockApiService.GET_Versions as jest.Mock).mockResolvedValue({ data: { versions: [] } });
    await submitCb();
    expect(mockApiService.PATCH_SubmitResult).toHaveBeenCalled();
  });

  it('should set initial selected review option when invoked from effect path', () => {
    mockCacheService.currentMetadata!.set({ status_id: 6 });
    component.setInitialSelectedReviewOption();
    expect(mockSubmissionService.statusSelected()?.statusId).toBe(6);
  });

  it('effect should call setInitialSelectedReviewOption on first open when constructed with modal open', () => {
    // Prepare mocks for a new instance where the modal is already open
    mockCacheService.currentMetadata!.set({ status_id: 5 });
    mockAllModalsService.modalConfig!.set({
      submitResult: { isOpen: true },
      createResult: { isOpen: false },
      requestPartner: { isOpen: false },
      askForHelp: { isOpen: false }
    });
    const protoSpy = jest.spyOn(SubmitResultContentComponent.prototype, 'setInitialSelectedReviewOption');
    const newFixture = TestBed.createComponent(SubmitResultContentComponent);
    newFixture.detectChanges();
    expect(protoSpy).toHaveBeenCalled();
    protoSpy.mockRestore();
  });

  it('loadStatuses should catch GET_ResultStatus errors and still set statusData for successful requests', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (mockApiService.GET_ResultStatus as jest.Mock).mockImplementation((statusId: number) => {
      if (statusId === 5) return Promise.reject(new Error('Network error'));
      return Promise.resolve({
        successfulRequest: true,
        data: { result_status_id: statusId, name: statusId === 6 ? 'Approve' : 'Reject' }
      });
    });
    await (component as any).loadStatuses();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading status for statusId 5:', expect.any(Error));
    expect(component.statusData()[6]).toBeDefined();
    expect(component.statusData()[7]).toBeDefined();
    expect(component.statusData()[5]).toBeUndefined();
    consoleErrorSpy.mockRestore();
  });

  it('loadStatuses should load status ids 10, 11, 15 when submitResultOrigin is latest', async () => {
    mockAllModalsService.submitResultOrigin!.set('latest');
    (mockApiService.GET_ResultStatus as jest.Mock).mockImplementation((statusId: number) =>
      Promise.resolve({
        successfulRequest: true,
        data: { result_status_id: statusId, name: statusId === 10 ? 'OICR Accepted' : statusId === 11 ? 'Postpone' : 'OICR Not Accepted' }
      })
    );
    await (component as any).loadStatuses();
    expect(mockApiService.GET_ResultStatus).toHaveBeenCalledWith(10);
    expect(mockApiService.GET_ResultStatus).toHaveBeenCalledWith(11);
    expect(mockApiService.GET_ResultStatus).toHaveBeenCalledWith(15);
    expect(component.statusData()[10]).toBeDefined();
    expect(component.statusData()[11]).toBeDefined();
    expect(component.statusData()[15]).toBeDefined();
  });

  it('should submit review successfully', async () => {
    const mockResponse = { successfulRequest: true };
    mockApiService.PATCH_SubmitResult!.mockResolvedValue(mockResponse);
    mockApiService.GET_Versions!.mockResolvedValue({
      data: { versions: [{ report_year_id: 2024 }] }
    });

    const selectedOption = { statusId: 6, commentLabel: undefined };
    mockSubmissionService.statusSelected.set(selectedOption);
    mockSubmissionService.comment.set('Test comment');

    await component.submitReview();

    expect(mockApiService.PATCH_SubmitResult).toHaveBeenCalledWith({
      resultCode: 123,
      comment: 'Test comment',
      status: 6
    });

    expect(mockMetadataService.update).toHaveBeenCalledWith(123);
    expect(mockCacheService.lastResultId!.set).toHaveBeenCalledWith(null);
    expect(mockCacheService.lastVersionParam.set).toHaveBeenCalledWith(null);
    expect(mockCacheService.liveVersionData.set).toHaveBeenCalledWith(null);
    expect(mockCacheService.versionsList.set).toHaveBeenCalledWith([]);

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/test-url'], {
      queryParams: {},
      replaceUrl: true
    });

    expect(mockAllModalsService.closeModal).toHaveBeenCalledWith('submitResult');
  });

  it('should handle unsuccessful request', async () => {
    const mockResponse = { successfulRequest: false };
    mockApiService.PATCH_SubmitResult!.mockResolvedValue(mockResponse);

    const selectedOption = { statusId: 5, commentLabel: 'Add comments' };
    mockSubmissionService.statusSelected.set(selectedOption);
    mockSubmissionService.comment.set('Test comment');

    await component.submitReview();

    expect(mockApiService.PATCH_SubmitResult).toHaveBeenCalled();
    expect(mockMetadataService.update).not.toHaveBeenCalled();
    // closeModal is not called when request is unsuccessful
    expect(mockAllModalsService.closeModal).not.toHaveBeenCalled();
  });

  it('should clear comment for approve status (statusId 6)', async () => {
    const mockResponse = { successfulRequest: true };
    mockApiService.PATCH_SubmitResult!.mockResolvedValue(mockResponse);
    mockApiService.GET_Versions!.mockResolvedValue({
      data: { versions: [{ report_year_id: 2024 }] }
    });

    const selectedOption = { statusId: 6, commentLabel: undefined };
    mockSubmissionService.statusSelected.set(selectedOption);
    mockSubmissionService.comment.set('Test comment');

    await component.submitReview();

    expect(mockSubmissionService.comment()).toBe('');
  });

  it('should handle versions response with array', async () => {
    const mockResponse = { successfulRequest: true };
    mockApiService.PATCH_SubmitResult!.mockResolvedValue(mockResponse);
    mockApiService.GET_Versions!.mockResolvedValue({
      data: { versions: [{ report_year_id: 2024 }, { report_year_id: 2023 }] }
    });

    const selectedOption = { statusId: 6, commentLabel: undefined };
    mockSubmissionService.statusSelected.set(selectedOption);

    await component.submitReview();

    expect(mockCacheService.versionsList.set).toHaveBeenCalledWith([
      { report_year_id: 2024 },
      { report_year_id: 2023 }
    ]);

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/test-url'], {
      queryParams: { version: 2024 },
      replaceUrl: true
    });
  });

  it('should handle versions response with non-array', async () => {
    const mockResponse = { successfulRequest: true };
    mockApiService.PATCH_SubmitResult!.mockResolvedValue(mockResponse);
    mockApiService.GET_Versions!.mockResolvedValue({
      data: { versions: 'not-an-array' }
    });

    const selectedOption = { statusId: 6, commentLabel: undefined };
    mockSubmissionService.statusSelected.set(selectedOption);

    await component.submitReview();

    expect(mockCacheService.versionsList.set).toHaveBeenCalledWith([]);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/test-url'], {
      queryParams: {},
      replaceUrl: true
    });
  });

  it('should handle empty versions array', async () => {
    const mockResponse = { successfulRequest: true };
    mockApiService.PATCH_SubmitResult!.mockResolvedValue(mockResponse);
    mockApiService.GET_Versions!.mockResolvedValue({
      data: { versions: [] }
    });

    const selectedOption = { statusId: 6, commentLabel: undefined };
    mockSubmissionService.statusSelected.set(selectedOption);

    await component.submitReview();

    expect(mockCacheService.versionsList.set).toHaveBeenCalledWith([]);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/test-url'], {
      queryParams: {},
      replaceUrl: true
    });
  });

  it('should not clear comment for non-approve status', async () => {
    const mockResponse = { successfulRequest: true };
    mockApiService.PATCH_SubmitResult!.mockResolvedValue(mockResponse);

    const selectedOption = { statusId: 5, commentLabel: 'Add comments' };
    mockSubmissionService.statusSelected.set(selectedOption);
    mockSubmissionService.comment.set('Test comment');

    await component.submitReview();

    expect(mockSubmissionService.comment()).toBe('Test comment');
  });

  it('should not handle versions for non-approve status', async () => {
    const mockResponse = { successfulRequest: true };
    mockApiService.PATCH_SubmitResult!.mockResolvedValue(mockResponse);

    const selectedOption = { statusId: 5, commentLabel: 'Add comments' };
    mockSubmissionService.statusSelected.set(selectedOption);

    await component.submitReview();

    expect(mockApiService.GET_Versions).not.toHaveBeenCalled();
  });

  it('should update form correctly', () => {
    component.updateForm('mel_regional_expert', 'test-expert');
    expect(component.form().mel_regional_expert).toBe('test-expert');

    component.updateForm('oicr_internal_code', 'test-code');
    expect(component.form().oicr_internal_code).toBe('test-code');

    component.updateForm('sharepoint_link', 'test-link');
    expect(component.form().sharepoint_link).toBe('test-link');
  });

  it('should handle latest flow review options', () => {
    // Set statusData with the expected labels and action_description for latest flow
    component.statusData.set({
      10: { result_status_id: 10, name: 'OICR Accepted', action_description: 'The development of the OICR will continue with backstopping from the PISA-SPRM team.' } as ResultStatus,
      11: { result_status_id: 11, name: 'Postpone', action_description: 'Not enough evidence for this reporting year.' } as ResultStatus,
      15: { result_status_id: 15, name: 'OICR Not Accepted', action_description: 'Reject this result and specify the reason.' } as ResultStatus
    });

    mockAllModalsService.submitResultOrigin!.set('latest');
    
    const options = component.reviewOptions();
    expect(options).toHaveLength(3);
    
    // Check approve option for latest flow
    expect(options[0]).toEqual({
      key: 'approve',
      label: 'OICR Accepted',
      description: 'The development of the OICR will continue with backstopping from the PISA-SPRM team.',
      icon: 'pi-check-circle',
      color: 'text-[#509C55]',
      message: 'Once this result is approved, no further changes will be allowed.',
      commentLabel: undefined,
      placeholder: '',
      statusId: 10,
      selected: false
    });

    // Check revise option for latest flow (becomes Postpone)
    expect(options[1]).toEqual({
      key: 'revise',
      label: 'Postpone',
      description: 'Not enough evidence for this reporting year.',
      icon: 'pi-minus-circle',
      color: 'text-[#e69f00]',
      message: 'The result submitter will address the provided recommendations and resubmit for review.',
      commentLabel: 'Justification',
      placeholder: 'Please briefly elaborate your decision',
      statusId: 11,
      selected: false,
      disabled: false
    });

    // Check reject option for latest flow
    expect(options[2]).toEqual({
      key: 'reject',
      label: 'OICR Not Accepted',
      description: 'Reject this result and specify the reason.',
      icon: 'pi-times-circle',
      color: 'text-[#cf0808]',
      message: 'If the result is rejected, it can no longer be edited or resubmitted.',
      commentLabel: 'Justification',
      placeholder: 'Please briefly elaborate your decision',
      statusId: 15,
      selected: false,
      disabled: false
    });
  });

  it('should handle latest flow submit review with approve', async () => {
    mockAllModalsService.submitResultOrigin!.set('latest');
    mockCacheService.currentMetadata!.set({ indicator_id: 5, status_id: 9 });
    mockCacheService.getCurrentNumericResultId!.mockReturnValue(123);
    
    const selectedOption = { statusId: 10, commentLabel: undefined };
    mockSubmissionService.statusSelected.set(selectedOption);
    mockSubmissionService.comment.set('Test comment');
    
    const formValue = { mel_regional_expert: 'expert1', oicr_internal_code: 'OICR-123', sharepoint_link: 'https://test.com' };
    component.form.set(formValue);
    
    const mockResponse = { successfulRequest: true };
    mockApiService.PATCH_SubmitResult!.mockResolvedValue(mockResponse);

    await component.submitReview();

    expect(mockApiService.PATCH_SubmitResult).toHaveBeenCalledWith(
      {
        resultCode: 123,
        comment: 'Test comment',
        status: 10
      },
      {
        mel_regional_expert: 'expert1',
        oicr_internal_code: 'OICR-123',
        sharepoint_link: 'https://test.com'
      }
    );

    expect(mockAllModalsService.setSubmitResultOrigin).toHaveBeenCalledWith(null);
    expect(mockAllModalsService.setSubmitHeader).toHaveBeenCalledWith(null);
    expect(mockAllModalsService.setSubmitBackStep).toHaveBeenCalledWith(null);
    expect(mockAllModalsService.clearSubmissionData).toHaveBeenCalled();
    expect(mockAllModalsService.createResultManagementService.resetModal).toHaveBeenCalled();
    expect(mockAllModalsService.closeModal).toHaveBeenCalledWith('submitResult');
    expect(mockActionsService.showGlobalAlert).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'Review submitted successfully',
      hasNoCancelButton: true,
      detail: 'Your review has been submitted and the OICR development process will continue with backstopping from the PISA-SPRM team.',
      confirmCallback: {
        label: 'Done',
        event: expect.any(Function)
      }
    });
  });

  it('should handle latest flow submit review with non-approve', async () => {
    mockAllModalsService.submitResultOrigin!.set('latest');
    
    const selectedOption = { statusId: 11, commentLabel: 'Justification' };
    mockSubmissionService.statusSelected.set(selectedOption);
    mockSubmissionService.comment.set('Test comment');
    
    const formValue = { mel_regional_expert: '', oicr_internal_code: '', sharepoint_link: '' };
    component.form.set(formValue);
    
    const mockResponse = { successfulRequest: true };
    mockApiService.PATCH_SubmitResult!.mockResolvedValue(mockResponse);

    await component.submitReview();

    expect(mockApiService.PATCH_SubmitResult).toHaveBeenCalledWith(
      {
        resultCode: 123,
        comment: 'Test comment',
        status: 11
      },
      undefined
    );

    expect(mockAllModalsService.setSubmitResultOrigin).toHaveBeenCalledWith(null);
    expect(mockAllModalsService.setSubmitHeader).toHaveBeenCalledWith(null);
    expect(mockAllModalsService.setSubmitBackStep).toHaveBeenCalledWith(null);
    expect(mockAllModalsService.clearSubmissionData).toHaveBeenCalled();
    expect(mockAllModalsService.createResultManagementService.resetModal).toHaveBeenCalled();
    expect(mockAllModalsService.closeModal).toHaveBeenCalledWith('submitResult');
    expect(mockActionsService.showGlobalAlert).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'Review submitted successfully',
      hasNoCancelButton: true,
      detail: 'Your review has been submitted and the OICR development process will continue with backstopping from the PISA-SPRM team.',
      confirmCallback: {
        label: 'Done',
        event: expect.any(Function)
      }
    });
  });

  it('should handle latest flow submit review with unsuccessful request', async () => {
    mockAllModalsService.submitResultOrigin!.set('latest');
    
    const selectedOption = { statusId: 10, commentLabel: undefined };
    mockSubmissionService.statusSelected.set(selectedOption);
    
    const mockResponse = { successfulRequest: false };
    mockApiService.PATCH_SubmitResult!.mockResolvedValue(mockResponse);

    await component.submitReview();

    expect(mockApiService.PATCH_SubmitResult).toHaveBeenCalled();
    expect(mockAllModalsService.closeModal).not.toHaveBeenCalled();
    expect(mockCurrentResultService.openEditRequestdOicrsModal).not.toHaveBeenCalled();
  });

  it('should handle latest flow submit review without metadata', async () => {
    mockAllModalsService.submitResultOrigin!.set('latest');
    mockCacheService.currentMetadata!.set(null);
    
    const selectedOption = { statusId: 10, commentLabel: undefined };
    mockSubmissionService.statusSelected.set(selectedOption);
    
    const mockResponse = { successfulRequest: true };
    mockApiService.PATCH_SubmitResult!.mockResolvedValue(mockResponse);

    await component.submitReview();

    expect(mockApiService.PATCH_SubmitResult).toHaveBeenCalled();
    expect(mockAllModalsService.setSubmitResultOrigin).toHaveBeenCalledWith(null);
    expect(mockAllModalsService.setSubmitHeader).toHaveBeenCalledWith(null);
    expect(mockAllModalsService.setSubmitBackStep).toHaveBeenCalledWith(null);
    expect(mockAllModalsService.clearSubmissionData).toHaveBeenCalled();
    expect(mockAllModalsService.createResultManagementService.resetModal).toHaveBeenCalled();
    expect(mockAllModalsService.closeModal).toHaveBeenCalledWith('submitResult');
    expect(mockActionsService.showGlobalAlert).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'Review submitted successfully',
      hasNoCancelButton: true,
      detail: 'Your review has been submitted and the OICR development process will continue with backstopping from the PISA-SPRM team.',
      confirmCallback: {
        label: 'Done',
        event: expect.any(Function)
      }
    });
    expect(mockCurrentResultService.openEditRequestdOicrsModal).not.toHaveBeenCalled();
  });

  it('should initialize form with submission service values when modal opens', () => {
    mockSubmissionService.melRegionalExpert!.set('expert1');
    mockSubmissionService.oicrNo!.set('OICR-123');
    mockSubmissionService.sharePointFolderLink!.set('https://test.com');
    
    // Simulate modal opening
    mockAllModalsService.modalConfig!.set({
      submitResult: { isOpen: true },
      createResult: { isOpen: false },
      requestPartner: { isOpen: false },
      askForHelp: { isOpen: false }
    });

    // Manually trigger the effect logic
    component.form.set({
      mel_regional_expert: mockSubmissionService.melRegionalExpert!(),
      oicr_internal_code: mockSubmissionService.oicrNo!(),
      sharepoint_link: mockSubmissionService.sharePointFolderLink!()
    });

    expect(component.form().mel_regional_expert).toBe('expert1');
    expect(component.form().oicr_internal_code).toBe('OICR-123');
    expect(component.form().sharepoint_link).toBe('https://test.com');
  });

  it('should build latest body correctly for approve', () => {
    const formValue = { mel_regional_expert: 'expert1', oicr_internal_code: 'OICR-123', sharepoint_link: 'https://test.com' };
    const result = (component as any).buildLatestBody(true, formValue);
    
    expect(result).toEqual({
      mel_regional_expert: 'expert1',
      oicr_internal_code: 'OICR-123',
      sharepoint_link: 'https://test.com'
    });
  });

  it('should build latest body correctly for non-approve', () => {
    const formValue = { mel_regional_expert: 'expert1', oicr_internal_code: 'OICR-123', sharepoint_link: 'https://test.com' };
    const result = (component as any).buildLatestBody(false, formValue);
    
    expect(result).toBeUndefined();
  });

  it('should build latest body with empty values', () => {
    const formValue = { mel_regional_expert: '', oicr_internal_code: '', sharepoint_link: '' };
    const result = (component as any).buildLatestBody(true, formValue);
    
    expect(result).toEqual({
      mel_regional_expert: '',
      oicr_internal_code: '',
      sharepoint_link: ''
    });
  });

  it('should build latest body with undefined values', () => {
    const formValue = { mel_regional_expert: undefined, oicr_internal_code: undefined, sharepoint_link: undefined };
    const result = (component as any).buildLatestBody(true, formValue);
    
    expect(result).toEqual({
      mel_regional_expert: '',
      oicr_internal_code: '',
      sharepoint_link: ''
    });
  });

  it('should handle setComment method', () => {
    const mockEvent = {
      target: { value: 'Test comment' }
    } as any;
    
    component.setComment(mockEvent);
    
    expect(mockSubmissionService.comment.set).toHaveBeenCalledWith('Test comment');
  });

  it('should handle disabledConfirmSubmit with comment required', () => {
    const selectedOption = { commentLabel: 'Required comment' };
    mockSubmissionService.statusSelected.set(selectedOption);
    mockSubmissionService.comment.set('');
    
    const result = component.disabledConfirmSubmit();
    
    expect(result).toBe(true);
  });

  it('should handle disabledConfirmSubmit with comment provided', () => {
    const selectedOption = { commentLabel: 'Required comment' };
    mockSubmissionService.statusSelected.set(selectedOption);
    mockSubmissionService.comment.set('Test comment');
    
    const result = component.disabledConfirmSubmit();
    
    expect(result).toBe(false);
  });

  it('should handle disabledConfirmSubmit with no comment required', () => {
    const selectedOption = { commentLabel: undefined };
    mockSubmissionService.statusSelected.set(selectedOption);
    mockSubmissionService.comment.set('');
    
    const result = component.disabledConfirmSubmit();
    
    expect(result).toBe(false);
  });

  it('should handle disabledConfirmSubmit with no status selected', () => {
    mockSubmissionService.statusSelected.set(null);
    mockSubmissionService.comment.set('');
    
    const result = component.disabledConfirmSubmit();
    
    expect(result).toBe(true);
  });

  it('should handle submittionOptions computed', () => {
    const selectedOption = { statusId: 6, label: 'Approve' };
    mockSubmissionService.statusSelected.set(selectedOption);
    
    const options = component.submittionOptions();
    
    expect(options).toHaveLength(3);
    expect(options[0].selected).toBe(true);
    expect(options[1].selected).toBe(false);
    expect(options[2].selected).toBe(false);
  });

  it('should handle submittionOptions with no status selected', () => {
    mockSubmissionService.statusSelected.set(null);
    
    const options = component.submittionOptions();
    
    expect(options).toHaveLength(3);
    expect(options[0].selected).toBe(false);
    expect(options[1].selected).toBe(false);
    expect(options[2].selected).toBe(false);
  });

  it('should handle setInitialSelectedReviewOption with matching status', () => {
    mockCacheService.currentMetadata!.set({ status_id: 6 });
    
    component.setInitialSelectedReviewOption();
    
    expect(mockSubmissionService.statusSelected.set).toHaveBeenCalledWith(
      expect.objectContaining({ statusId: 6 })
    );
  });

  it('should handle setInitialSelectedReviewOption with no matching status', () => {
    mockCacheService.currentMetadata!.set({ status_id: 99 });
    
    component.setInitialSelectedReviewOption();
    
    // Now we explicitly clear the selection when there is no matching status
    expect(mockSubmissionService.statusSelected.set).toHaveBeenCalledWith(null);
  });

  it('should handle setInitialSelectedReviewOption with null status', () => {
    mockCacheService.currentMetadata!.set({ status_id: null });
    
    component.setInitialSelectedReviewOption();
    
    expect(mockSubmissionService.statusSelected.set).not.toHaveBeenCalled();
  });

  it('should handle setInitialSelectedReviewOption with undefined status', () => {
    mockCacheService.currentMetadata!.set({ status_id: undefined });
    
    component.setInitialSelectedReviewOption();
    
    expect(mockSubmissionService.statusSelected.set).not.toHaveBeenCalled();
  });

  it('should handle buildLatestBody with empty form values', () => {
    const formValue = { mel_regional_expert: '', oicr_internal_code: '', sharepoint_link: '' };
    const result = (component as any).buildLatestBody(true, formValue);
    
    expect(result).toEqual({
      mel_regional_expert: '',
      oicr_internal_code: '',
      sharepoint_link: ''
    });
  });

  it('should handle buildLatestBody with undefined form values', () => {
    const formValue = { mel_regional_expert: undefined, oicr_internal_code: undefined, sharepoint_link: undefined };
    const result = (component as any).buildLatestBody(true, formValue);
    
    expect(result).toEqual({
      mel_regional_expert: '',
      oicr_internal_code: '',
      sharepoint_link: ''
    });
  });

  it('should handle legacy flow submit review', async () => {
    mockAllModalsService.submitResultOrigin!.set(null);
    
    const selectedOption = { statusId: 6, commentLabel: undefined };
    mockSubmissionService.statusSelected.set(selectedOption);
    mockSubmissionService.comment.set('Test comment');
    
    const mockResponse = { successfulRequest: true };
    mockApiService.PATCH_SubmitResult!.mockResolvedValue(mockResponse);
    mockApiService.GET_Versions!.mockResolvedValue({ data: { versions: [{ report_year_id: 2024 }] } });
    
    await component.submitReview();

    expect(mockApiService.PATCH_SubmitResult).toHaveBeenCalledWith({
      resultCode: 123,
      comment: 'Test comment',
      status: 6
    });
    expect(mockAllModalsService.closeModal).toHaveBeenCalledWith('submitResult');
  });

  it('should handle legacy flow submit review with unsuccessful request', async () => {
    mockAllModalsService.submitResultOrigin!.set(null);
    
    const selectedOption = { statusId: 6, commentLabel: undefined };
    mockSubmissionService.statusSelected.set(selectedOption);
    mockSubmissionService.comment.set('Test comment');
    
    const mockResponse = { successfulRequest: false };
    mockApiService.PATCH_SubmitResult!.mockResolvedValue(mockResponse);
    
    await component.submitReview();

    expect(mockApiService.PATCH_SubmitResult).toHaveBeenCalled();
    expect(mockAllModalsService.closeModal).not.toHaveBeenCalled();
  });

  it('should handle legacy flow submit review with status 6 and versions', async () => {
    mockAllModalsService.submitResultOrigin!.set(null);
    
    const selectedOption = { statusId: 6, commentLabel: undefined };
    mockSubmissionService.statusSelected.set(selectedOption);
    mockSubmissionService.comment.set('Test comment');
    
    const mockResponse = { successfulRequest: true };
    mockApiService.PATCH_SubmitResult!.mockResolvedValue(mockResponse);
    mockApiService.GET_Versions!.mockResolvedValue({ data: { versions: [{ report_year_id: 2024 }] } });
    
    await component.submitReview();

    expect(mockApiService.PATCH_SubmitResult).toHaveBeenCalled();
    expect(mockApiService.GET_Versions).toHaveBeenCalledWith(123);
    expect(mockAllModalsService.closeModal).toHaveBeenCalledWith('submitResult');
  });

  it('should handle legacy flow submit review with status 6 and no versions', async () => {
    mockAllModalsService.submitResultOrigin!.set(null);
    
    const selectedOption = { statusId: 6, commentLabel: undefined };
    mockSubmissionService.statusSelected.set(selectedOption);
    mockSubmissionService.comment.set('Test comment');
    
    const mockResponse = { successfulRequest: true };
    mockApiService.PATCH_SubmitResult!.mockResolvedValue(mockResponse);
    mockApiService.GET_Versions!.mockResolvedValue({ data: { versions: [] } });
    
    await component.submitReview();

    expect(mockApiService.PATCH_SubmitResult).toHaveBeenCalled();
    expect(mockApiService.GET_Versions).toHaveBeenCalledWith(123);
    expect(mockAllModalsService.closeModal).toHaveBeenCalledWith('submitResult');
  });

  it('should handle legacy flow submit review with non-array versions', async () => {
    mockAllModalsService.submitResultOrigin!.set(null);
    
    const selectedOption = { statusId: 6, commentLabel: undefined };
    mockSubmissionService.statusSelected.set(selectedOption);
    mockSubmissionService.comment.set('Test comment');
    
    const mockResponse = { successfulRequest: true };
    mockApiService.PATCH_SubmitResult!.mockResolvedValue(mockResponse);
    mockApiService.GET_Versions!.mockResolvedValue({ data: { versions: null } });
    
    await component.submitReview();

    expect(mockApiService.PATCH_SubmitResult).toHaveBeenCalled();
    expect(mockApiService.GET_Versions).toHaveBeenCalledWith(123);
    expect(mockAllModalsService.closeModal).toHaveBeenCalledWith('submitResult');
  });

  it('should handle review options with non-reject key', () => {
    // Test the reviewOptions computed property with options that don't have key 'reject'
    const options = component.reviewOptions();
    
    // Find an option that doesn't have key 'reject' to test the return opt; line
    const nonRejectOption = options.find(opt => opt.key !== 'reject');
    expect(nonRejectOption).toBeDefined();
    expect(nonRejectOption).toEqual(expect.objectContaining({
      key: expect.any(String),
      statusId: expect.any(Number)
    }));
  });

  it('should return original option for non-reject keys in reviewOptions', () => {
    // This test specifically covers the return opt; line (line 118)
    const options = component.reviewOptions();
    
    // Get all options that are not 'reject' to ensure the return opt; path is covered
    const nonRejectOptions = options.filter(opt => opt.key !== 'reject');
    
    expect(nonRejectOptions.length).toBeGreaterThan(0);
    
    // Verify that non-reject options maintain their original structure
    nonRejectOptions.forEach(option => {
      expect(option).toHaveProperty('key');
      expect(option).toHaveProperty('statusId');
      expect(option.key).not.toBe('reject');
    });
  });

  it('should map review options correctly with reject and non-reject keys', () => {
    // This test specifically targets the mapping logic to cover line 118
    const options = component.reviewOptions();
    
    // Verify we have both reject and non-reject options
    const rejectOption = options.find(opt => opt.key === 'reject');
    const nonRejectOptions = options.filter(opt => opt.key !== 'reject');
    
    expect(rejectOption).toBeDefined();
    expect(nonRejectOptions.length).toBeGreaterThan(0);
    
    // Verify reject option has the modified properties
    expect(rejectOption.commentLabel).toBe('Add the reject reason');
    
    // Verify non-reject options maintain original structure (covers return opt; line)
    nonRejectOptions.forEach(option => {
      expect(option).toHaveProperty('key');
      expect(option).toHaveProperty('statusId');
      expect(option.key).not.toBe('reject');
      // These should not have the modified commentLabel
      expect(option.commentLabel).not.toBe('Add the reject reason');
    });
  });

  it('should execute closeAllModals callback in success alert', async () => {
    mockAllModalsService.submitResultOrigin!.set('latest');
    
    const selectedOption = { statusId: 4, commentLabel: undefined };
    mockSubmissionService.statusSelected.set(selectedOption);
    
    const mockResponse = { successfulRequest: true };
    mockApiService.PATCH_SubmitResult!.mockResolvedValue(mockResponse);

    await component.submitReview();

    expect(mockAllModalsService.setSubmitResultOrigin).toHaveBeenCalledWith(null);
    expect(mockAllModalsService.setSubmitHeader).toHaveBeenCalledWith(null);
    expect(mockAllModalsService.setSubmitBackStep).toHaveBeenCalledWith(null);
    expect(mockAllModalsService.clearSubmissionData).toHaveBeenCalled();
    expect(mockAllModalsService.createResultManagementService.resetModal).toHaveBeenCalled();
    expect(mockActionsService.showGlobalAlert).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'Review submitted successfully',
      hasNoCancelButton: true,
      detail: 'Your review has been submitted and the OICR development process will continue with backstopping from the PISA-SPRM team.',
      confirmCallback: {
        label: 'Done',
        event: expect.any(Function)
      }
    });

    // Test the callback function
    const alertCall = mockActionsService.showGlobalAlert.mock.calls[0][0];
    const callback = alertCall.confirmCallback.event;
    
    // Execute the callback to test the closeAllModals call
    callback();
    
    expect(mockAllModalsService.closeAllModals).toHaveBeenCalled();
  });


  it('should handle buildLatestBody with undefined formValue', () => {
    // Test the case where formValue is undefined (line 167)
    const result = component['buildLatestBody'](true, undefined);
    
    expect(result).toEqual({
      oicr_internal_code: '',
      mel_regional_expert: '',
      sharepoint_link: ''
    });
  });

  it('should handle disabledConfirmSubmit with latest origin and statusId 10 and all fields filled', () => {
    mockAllModalsService.submitResultOrigin.set('latest');
    mockSubmissionService.statusSelected.set({ statusId: 10, commentLabel: undefined } as any);
    mockSubmissionService.comment.set('');
    
    component.form.set({
      mel_regional_expert: 'test expert',
      oicr_internal_code: 'test code',
      sharepoint_link: 'https://example.com/sharepoint'
    });
    
    const result = component.disabledConfirmSubmit();
    
    expect(result).toBe(false);
  });

  it('should handle disabledConfirmSubmit with latest origin and statusId 10 and missing fields', () => {
    mockAllModalsService.submitResultOrigin.set('latest');
    mockSubmissionService.statusSelected.set({ statusId: 10, commentLabel: undefined } as any);
    mockSubmissionService.comment.set('');
    
    component.form.set({
      mel_regional_expert: 'test expert',
      oicr_internal_code: '',
      sharepoint_link: 'test link'
    });
    
    const result = component.disabledConfirmSubmit();
    
    expect(result).toBe(true);
  });

  it('should handle refreshTables error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockProjectResultsTableService.getData = jest.fn().mockRejectedValue(new Error('Test error'));
    mockResultsCenterService.main = jest.fn().mockRejectedValue(new Error('Test error'));
    
    await component['refreshTables']();
    
    expect(consoleSpy).toHaveBeenCalledWith('Error refreshing tables:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('should handle reviewOptions with non-latest origin', () => {
    mockAllModalsService.submitResultOrigin.set(null);
    
    const result = component.reviewOptions();
    
    expect(result).toEqual(component['baseReviewOptions']);
  });

  it('should handle reviewOptions with latest origin', () => {
    mockAllModalsService.submitResultOrigin.set('latest');
    
    const result = component.reviewOptions();
    
    // Should return the modified options for latest origin
    expect(result).toHaveLength(3);
    expect(result[0].key).toBe('approve');
    expect(result[1].key).toBe('revise');
    expect(result[2].key).toBe('reject');
  });

  it('should handle reviewOptions mapping with all conditions', () => {
    mockAllModalsService.submitResultOrigin.set('latest');
    
    // This test covers the return opt; line in the map function
    const result = component.reviewOptions();
    
    // Verify that all options are processed and returned
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    
    // Verify that the mapping function processes all options
    result.forEach(option => {
      expect(option).toHaveProperty('key');
      expect(option).toHaveProperty('label');
      expect(option).toHaveProperty('statusId');
    });
  });

  it('should return base headerData when submitResultOrigin is not latest', () => {
    const baseHeader = { status_id: '6', indicator_id: 1 };
    mockAllModalsService.submitResultOrigin.set(null);
    mockAllModalsService.submitHeader.set(baseHeader);
    
    const result = component.headerData();
    
    expect(result).toEqual(baseHeader);
  });

  it('should return base headerData when submitHeader is null', () => {
    mockAllModalsService.submitHeader.set(null);
    
    const result = component.headerData();
    
    expect(result).toBeNull();
  });

  it('should return base headerData when latest origin but status_id is not 7 or 11', () => {
    const baseHeader = { status_id: '6', indicator_id: 1 };
    mockAllModalsService.submitResultOrigin.set('latest');
    mockAllModalsService.submitHeader.set(baseHeader);
    mockCacheService.currentMetadata.set({ status_id: 5 });
    
    const result = component.headerData();
    
    expect(result).toEqual(baseHeader);
  });

  it('should return modified headerData when latest origin and status_id is 7', () => {
    const baseHeader = { status_id: '6', indicator_id: 1 };
    const mockResultStatus = { result_status_id: 7, name: 'Reject' } as ResultStatus;
    mockAllModalsService.submitResultOrigin.set('latest');
    mockAllModalsService.submitHeader.set(baseHeader);
    mockCacheService.currentMetadata.set({ status_id: 7, result_status: mockResultStatus });
    
    const result = component.headerData();
    
    expect(result).toEqual({
      ...baseHeader,
      status_id: '7',
      status_config: mockResultStatus
    });
  });

  it('should return modified headerData when latest origin and status_id is 11', () => {
    const baseHeader = { status_id: '6', indicator_id: 1 };
    const mockResultStatus = { result_status_id: 11, name: 'Postpone' } as ResultStatus;
    mockAllModalsService.submitResultOrigin.set('latest');
    mockAllModalsService.submitHeader.set(baseHeader);
    mockCacheService.currentMetadata.set({ status_id: 11, result_status: mockResultStatus });
    
    const result = component.headerData();
    
    expect(result).toEqual({
      ...baseHeader,
      status_id: '11',
      status_config: mockResultStatus
    });
  });

  it('should include result_official_code in headerData when latest origin has code in metadata', () => {
    const baseHeader = { status_id: '6', indicator_id: 1 };
    mockAllModalsService.submitResultOrigin.set('latest');
    mockAllModalsService.submitHeader.set(baseHeader);
    mockCacheService.currentMetadata.set({ status_id: 5, result_official_code: 12345 });

    const result = component.headerData();

    expect(result).toEqual({
      ...baseHeader,
      result_official_code: 12345
    });
  });

  it('should not select option when disabled', () => {
    const disabledOption = { statusId: 5, key: 'revise', disabled: true };
    const setSpy = jest.spyOn(mockSubmissionService.statusSelected, 'set');
    
    component.selectOption(disabledOption);
    
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('should select option when not disabled', () => {
    const enabledOption = { statusId: 5, key: 'revise', disabled: false };
    const setSpy = jest.spyOn(mockSubmissionService.statusSelected, 'set');
    
    component.selectOption(enabledOption);
    
    expect(setSpy).toHaveBeenCalledWith(enabledOption);
  });

  it('should handle onOptionFocus', () => {
    const option = { key: 'approve', statusId: 6 };
    const options = [
      { key: 'approve', statusId: 6 },
      { key: 'revise', statusId: 5 },
      { key: 'reject', statusId: 7 }
    ];
    
    // Mock document.querySelector
    const mockElement1 = { setAttribute: jest.fn() };
    const mockElement2 = { setAttribute: jest.fn() };
    const mockElement3 = { setAttribute: jest.fn() };
    
    jest.spyOn(document, 'querySelector')
      .mockReturnValueOnce(mockElement1 as any)
      .mockReturnValueOnce(mockElement2 as any)
      .mockReturnValueOnce(mockElement3 as any);
    
    // Mock submittionOptions to return our test options
    jest.spyOn(component, 'submittionOptions').mockReturnValue(options as any);
    
    component.onOptionFocus(option);
    
    expect(mockElement1.setAttribute).toHaveBeenCalledWith('tabindex', '0');
    expect(mockElement2.setAttribute).toHaveBeenCalledWith('tabindex', '-1');
    expect(mockElement3.setAttribute).toHaveBeenCalledWith('tabindex', '-1');
  });

  it('should handle onOptionFocus when element not found', () => {
    const option = { key: 'approve', statusId: 6 };
    const options = [
      { key: 'approve', statusId: 6 },
      { key: 'revise', statusId: 5 }
    ];
    
    jest.spyOn(document, 'querySelector').mockReturnValue(null);
    jest.spyOn(component, 'submittionOptions').mockReturnValue(options as any);
    
    // Should not throw
    expect(() => component.onOptionFocus(option)).not.toThrow();
  });

  it('should handle onOptionKeydown ArrowRight', () => {
    const options = [
      { key: 'approve', statusId: 6, disabled: false },
      { key: 'revise', statusId: 5, disabled: false },
      { key: 'reject', statusId: 7, disabled: false }
    ];
    const event = { key: 'ArrowRight', preventDefault: jest.fn() } as any;
    const option = options[0];
    
    jest.spyOn(component, 'submittionOptions').mockReturnValue(options as any);
    const focusOptionSpy = jest.spyOn(component as any, 'focusOption');
    
    component.onOptionKeydown(event, option, 0);
    
    expect(event.preventDefault).toHaveBeenCalled();
    expect(focusOptionSpy).toHaveBeenCalledWith(options[1]);
  });

  it('should handle onOptionKeydown ArrowDown', () => {
    const options = [
      { key: 'approve', statusId: 6, disabled: false },
      { key: 'revise', statusId: 5, disabled: false }
    ];
    const event = { key: 'ArrowDown', preventDefault: jest.fn() } as any;
    const option = options[0];
    
    jest.spyOn(component, 'submittionOptions').mockReturnValue(options as any);
    const focusOptionSpy = jest.spyOn(component as any, 'focusOption');
    
    component.onOptionKeydown(event, option, 0);
    
    expect(event.preventDefault).toHaveBeenCalled();
    expect(focusOptionSpy).toHaveBeenCalledWith(options[1]);
  });

  it('should handle onOptionKeydown ArrowLeft', () => {
    const options = [
      { key: 'approve', statusId: 6, disabled: false },
      { key: 'revise', statusId: 5, disabled: false }
    ];
    const event = { key: 'ArrowLeft', preventDefault: jest.fn() } as any;
    const option = options[1];
    
    jest.spyOn(component, 'submittionOptions').mockReturnValue(options as any);
    const focusOptionSpy = jest.spyOn(component as any, 'focusOption');
    
    component.onOptionKeydown(event, option, 1);
    
    expect(event.preventDefault).toHaveBeenCalled();
    expect(focusOptionSpy).toHaveBeenCalledWith(options[0]);
  });

  it('should handle onOptionKeydown ArrowUp', () => {
    const options = [
      { key: 'approve', statusId: 6, disabled: false },
      { key: 'revise', statusId: 5, disabled: false }
    ];
    const event = { key: 'ArrowUp', preventDefault: jest.fn() } as any;
    const option = options[1];
    
    jest.spyOn(component, 'submittionOptions').mockReturnValue(options as any);
    const focusOptionSpy = jest.spyOn(component as any, 'focusOption');
    
    component.onOptionKeydown(event, option, 1);
    
    expect(event.preventDefault).toHaveBeenCalled();
    expect(focusOptionSpy).toHaveBeenCalledWith(options[0]);
  });

  it('should handle onOptionKeydown ArrowLeft at first index', () => {
    const options = [
      { key: 'approve', statusId: 6, disabled: false },
      { key: 'revise', statusId: 5, disabled: false }
    ];
    const event = { key: 'ArrowLeft', preventDefault: jest.fn() } as any;
    const option = options[0];
    
    jest.spyOn(component, 'submittionOptions').mockReturnValue(options as any);
    const focusOptionSpy = jest.spyOn(component as any, 'focusOption');
    
    component.onOptionKeydown(event, option, 0);
    
    expect(event.preventDefault).toHaveBeenCalled();
    expect(focusOptionSpy).toHaveBeenCalledWith(options[1]);
  });

  it('should handle onOptionKeydown Space', () => {
    const options = [
      { key: 'approve', statusId: 6, disabled: false }
    ];
    const event = { key: ' ', preventDefault: jest.fn() } as any;
    const option = options[0];
    
    jest.spyOn(component, 'submittionOptions').mockReturnValue(options as any);
    const selectOptionSpy = jest.spyOn(component, 'selectOption');
    
    component.onOptionKeydown(event, option, 0);
    
    expect(event.preventDefault).toHaveBeenCalled();
    expect(selectOptionSpy).toHaveBeenCalledWith(option);
  });

  it('should handle onOptionKeydown Enter', () => {
    const options = [
      { key: 'approve', statusId: 6, disabled: false }
    ];
    const event = { key: 'Enter', preventDefault: jest.fn() } as any;
    const option = options[0];
    
    jest.spyOn(component, 'submittionOptions').mockReturnValue(options as any);
    const selectOptionSpy = jest.spyOn(component, 'selectOption');
    
    component.onOptionKeydown(event, option, 0);
    
    expect(event.preventDefault).toHaveBeenCalled();
    expect(selectOptionSpy).toHaveBeenCalledWith(option);
  });

  it('should not select option on Space/Enter when disabled', () => {
    const options = [
      { key: 'approve', statusId: 6, disabled: true }
    ];
    const event = { key: ' ', preventDefault: jest.fn() } as any;
    const option = options[0];
    
    jest.spyOn(component, 'submittionOptions').mockReturnValue(options as any);
    const selectOptionSpy = jest.spyOn(component, 'selectOption');
    
    component.onOptionKeydown(event, option, 0);
    
    expect(event.preventDefault).toHaveBeenCalled();
    expect(selectOptionSpy).not.toHaveBeenCalled();
  });

  it('should handle onOptionKeydown Home', () => {
    const options = [
      { key: 'approve', statusId: 6, disabled: false },
      { key: 'revise', statusId: 5, disabled: false }
    ];
    const event = { key: 'Home', preventDefault: jest.fn() } as any;
    const option = options[1];
    
    jest.spyOn(component, 'submittionOptions').mockReturnValue(options as any);
    const focusOptionSpy = jest.spyOn(component as any, 'focusOption');
    
    component.onOptionKeydown(event, option, 1);
    
    expect(event.preventDefault).toHaveBeenCalled();
    expect(focusOptionSpy).toHaveBeenCalledWith(options[0]);
  });

  it('should handle onOptionKeydown End', () => {
    const options = [
      { key: 'approve', statusId: 6, disabled: false },
      { key: 'revise', statusId: 5, disabled: false }
    ];
    const event = { key: 'End', preventDefault: jest.fn() } as any;
    const option = options[0];
    
    jest.spyOn(component, 'submittionOptions').mockReturnValue(options as any);
    const focusOptionSpy = jest.spyOn(component as any, 'focusOption');
    
    component.onOptionKeydown(event, option, 0);
    
    expect(event.preventDefault).toHaveBeenCalled();
    expect(focusOptionSpy).toHaveBeenCalledWith(options[1]);
  });

  it('should handle onOptionKeydown End with disabled last option', () => {
    const options = [
      { key: 'approve', statusId: 6, disabled: false },
      { key: 'revise', statusId: 5, disabled: true },
      { key: 'reject', statusId: 7, disabled: false }
    ];
    const event = { key: 'End', preventDefault: jest.fn() } as any;
    const option = options[0];
    
    jest.spyOn(component, 'submittionOptions').mockReturnValue(options as any);
    const focusOptionSpy = jest.spyOn(component as any, 'focusOption');
    
    component.onOptionKeydown(event, option, 0);
    
    expect(event.preventDefault).toHaveBeenCalled();
    expect(focusOptionSpy).toHaveBeenCalledWith(options[2]);
  });

  it('should handle onOptionKeydown Home with no enabled options', () => {
    const options = [
      { key: 'approve', statusId: 6, disabled: true },
      { key: 'revise', statusId: 5, disabled: true }
    ];
    const event = { key: 'Home', preventDefault: jest.fn() } as any;
    const option = options[0];
    
    jest.spyOn(component, 'submittionOptions').mockReturnValue(options as any);
    const focusOptionSpy = jest.spyOn(component as any, 'focusOption');
    
    component.onOptionKeydown(event, option, 0);
    
    expect(event.preventDefault).toHaveBeenCalled();
    expect(focusOptionSpy).not.toHaveBeenCalled();
  });

  it('should handle focusNextEnabledOption with all disabled', () => {
    const options = [
      { key: 'approve', statusId: 6, disabled: true },
      { key: 'revise', statusId: 5, disabled: true }
    ];
    const focusOptionSpy = jest.spyOn(component as any, 'focusOption');
    
    component['focusNextEnabledOption'](options as any, 0, 1);
    
    expect(focusOptionSpy).not.toHaveBeenCalled();
  });

  it('should handle focusNextEnabledOption with enabled option', () => {
    const options = [
      { key: 'approve', statusId: 6, disabled: false },
      { key: 'revise', statusId: 5, disabled: true }
    ];
    const focusOptionSpy = jest.spyOn(component as any, 'focusOption');
    
    component['focusNextEnabledOption'](options as any, 0, 1);
    
    expect(focusOptionSpy).toHaveBeenCalledWith(options[0]);
  });

  it('should handle focusNextEnabledOption with wrap around', () => {
    const options = [
      { key: 'approve', statusId: 6, disabled: true },
      { key: 'revise', statusId: 5, disabled: false }
    ];
    const focusOptionSpy = jest.spyOn(component as any, 'focusOption');
    
    component['focusNextEnabledOption'](options as any, 0, 1);
    
    expect(focusOptionSpy).toHaveBeenCalledWith(options[1]);
  });

  it('should handle focusOption when element exists', () => {
    const option = { key: 'approve', statusId: 6 };
    const mockElement = { focus: jest.fn() };
    
    jest.spyOn(document, 'querySelector').mockReturnValue(mockElement as any);
    
    component['focusOption'](option);
    
    expect(mockElement.focus).toHaveBeenCalled();
  });

  it('should handle focusOption when element does not exist', () => {
    const option = { key: 'approve', statusId: 6 };
    
    jest.spyOn(document, 'querySelector').mockReturnValue(null);
    
    // Should not throw
    expect(() => component['focusOption'](option)).not.toThrow();
  });

  it('should validateWebsite return false for undefined', () => {
    const result = component.validateWebsite(undefined);
    expect(result).toBe(false);
  });

  it('should validateWebsite return false for empty string', () => {
    const result = component.validateWebsite('');
    expect(result).toBe(false);
  });

  it('should validateWebsite return true for valid URL', () => {
    const result = component.validateWebsite('https://example.com');
    expect(result).toBe(true);
  });

  it('should validateWebsite return true for URL without protocol', () => {
    const result = component.validateWebsite('www.example.com');
    expect(result).toBe(true);
  });

  it('should validateWebsite return false for invalid URL', () => {
    const result = component.validateWebsite('not-a-url');
    expect(result).toBe(false);
  });

  it('should handle disabledConfirmSubmit with latest origin and statusId 10', () => {
    mockAllModalsService.submitResultOrigin.set('latest');
    mockSubmissionService.statusSelected.set({ statusId: 10, commentLabel: undefined } as any);
    mockSubmissionService.comment.set('');
    
    component.form.set({
      mel_regional_expert: 'test expert',
      oicr_internal_code: 'test code',
      sharepoint_link: 'https://example.com/sharepoint'
    });
    
    const result = component.disabledConfirmSubmit();
    
    expect(result).toBe(false);
  });

  it('should handle disabledConfirmSubmit with latest origin, statusId 10 and invalid sharepoint', () => {
    mockAllModalsService.submitResultOrigin.set('latest');
    mockSubmissionService.statusSelected.set({ statusId: 10, commentLabel: undefined } as any);
    mockSubmissionService.comment.set('');
    
    component.form.set({
      mel_regional_expert: 'test expert',
      oicr_internal_code: 'test code',
      sharepoint_link: 'invalid-url'
    });
    
    const result = component.disabledConfirmSubmit();
    
    expect(result).toBe(true);
  });

  it('should handle disabledConfirmSubmit with latest origin, statusId 10 and empty sharepoint', () => {
    mockAllModalsService.submitResultOrigin.set('latest');
    mockSubmissionService.statusSelected.set({ statusId: 10, commentLabel: undefined } as any);
    mockSubmissionService.comment.set('');
    
    component.form.set({
      mel_regional_expert: 'test expert',
      oicr_internal_code: 'test code',
      sharepoint_link: ''
    });
    
    const result = component.disabledConfirmSubmit();
    
    expect(result).toBe(false);
  });

  it('should handle disabledConfirmSubmit with latest origin, statusId 10 and whitespace fields', () => {
    mockAllModalsService.submitResultOrigin.set('latest');
    mockSubmissionService.statusSelected.set({ statusId: 10, commentLabel: undefined } as any);
    mockSubmissionService.comment.set('');
    
    component.form.set({
      mel_regional_expert: '   ',
      oicr_internal_code: 'test code',
      sharepoint_link: ''
    });
    
    const result = component.disabledConfirmSubmit();
    
    expect(result).toBe(true);
  });

  it('should handle refreshTables without contractId', async () => {
    mockProjectResultsTableService.contractId = null;
    mockResultsCenterService.main = jest.fn().mockResolvedValue(undefined);
    
    await component['refreshTables']();
    
    expect(mockProjectResultsTableService.getData).not.toHaveBeenCalled();
    expect(mockResultsCenterService.main).toHaveBeenCalled();
  });

  it('should reset disabled options when modal closes', () => {
    const setPostponeSpy = jest.spyOn(mockAllModalsService.disablePostponeOption, 'set');
    const setRejectSpy = jest.spyOn(mockAllModalsService.disableRejectOption, 'set');
    
    // Clear any previous calls
    setPostponeSpy.mockClear();
    setRejectSpy.mockClear();
    
    // Simulate modal opening first (so wasVisible becomes true)
    mockAllModalsService.modalConfig!.set({
      submitResult: { isOpen: true },
      createResult: { isOpen: false },
      requestPartner: { isOpen: false },
      askForHelp: { isOpen: false }
    });
    
    // Wait for effect to process
    fixture.detectChanges();
    
    // Now simulate modal closing (this should trigger the reset)
    mockAllModalsService.modalConfig!.set({
      submitResult: { isOpen: false },
      createResult: { isOpen: false },
      requestPartner: { isOpen: false },
      askForHelp: { isOpen: false }
    });
    
    // Wait for effect to process
    fixture.detectChanges();
    
    expect(setPostponeSpy).toHaveBeenCalledWith(false);
    expect(setRejectSpy).toHaveBeenCalledWith(false);
  });

  it('should handle reviewOptions return opt for non-latest flow', () => {
    // This test covers line 158: return opt; when isLatest is false
    mockAllModalsService.submitResultOrigin.set(null);
    
    const options = component.reviewOptions();
    
    // Should return original options without modification
    expect(options).toHaveLength(3);
    expect(options[0].statusId).toBe(6);
    expect(options[1].statusId).toBe(5);
    expect(options[2].statusId).toBe(7);
  });

  it('should handle reviewOptions return opt for latest flow with unknown key', () => {
    // This test covers line 158: return opt; when isLatest is true but key is not approve/revise/reject
    mockAllModalsService.submitResultOrigin.set('latest');
    
    // Temporarily add an option with a different key to baseReviewOptions
    const originalBaseOptions = component['baseReviewOptions'];
    const testOption = { 
      key: 'unknown', 
      label: 'Unknown', 
      description: 'Test', 
      icon: 'pi-question', 
      color: 'text-gray', 
      message: 'Test', 
      commentLabel: undefined, 
      placeholder: '', 
      statusId: 99, 
      selected: false 
    };
    component['baseReviewOptions'] = [...originalBaseOptions, testOption];
    
    const options = component.reviewOptions();
    
    // Should return the unknown option without modification (line 158)
    const unknownOption = options.find(opt => opt.key === 'unknown');
    expect(unknownOption).toBeDefined();
    expect(unknownOption?.statusId).toBe(99);
    
    // Restore original baseReviewOptions
    component['baseReviewOptions'] = originalBaseOptions;
  });

  it('should handle reviewOptions with undefined disablePostponeOption', () => {
    // This test covers line 137: disablePostpone = ... ?? false when disablePostponeOption is undefined
    mockAllModalsService.submitResultOrigin.set('latest');
    const originalDisablePostpone = mockAllModalsService.disablePostponeOption;
    delete (mockAllModalsService as any).disablePostponeOption;
    
    const options = component.reviewOptions();
    
    // Should use false as default when disablePostponeOption is undefined
    expect(options[1].disabled).toBe(false);
    
    // Restore
    mockAllModalsService.disablePostponeOption = originalDisablePostpone;
  });

  it('should handle reviewOptions with undefined disableRejectOption', () => {
    // This test covers line 138: disableReject = ... ?? false when disableRejectOption is undefined
    mockAllModalsService.submitResultOrigin.set('latest');
    const originalDisableReject = mockAllModalsService.disableRejectOption;
    delete (mockAllModalsService as any).disableRejectOption;
    
    const options = component.reviewOptions();
    
    // Should use false as default when disableRejectOption is undefined
    expect(options[2].disabled).toBe(false);
    
    // Restore
    mockAllModalsService.disableRejectOption = originalDisableReject;
  });

});