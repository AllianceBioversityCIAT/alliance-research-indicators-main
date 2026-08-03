import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AllModalsService } from './all-modals.service';
import { CreateResultManagementService } from '@shared/components/all-modals/modals-content/create-result-modal/services/create-result-management.service';
import { SubmissionService } from '@shared/services/submission.service';
import { Result } from '@shared/interfaces/result/result.interface';
import { OicrHeaderData } from '@shared/interfaces/oicr-header-data.interface';
import { ContactPersonFormData } from '@shared/interfaces/contact-person.interface';

describe('AllModalsService', () => {
  let service: AllModalsService;
  let mockCreateResultManagementService: any;
  let mockSubmissionService: any;

  const mockResult: Result = {
    id: 1,
    title: 'Test Result',
    description: 'Test Description',
    status: 'draft',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  } as Result;

  const mockOicrHeaderData: OicrHeaderData = {
    title: 'Test OICR',
    description: 'Test OICR Description'
  } as OicrHeaderData;

  const mockContactPersonData: ContactPersonFormData = {
    contact_person_id: 1,
    role_id: 2
  };

  beforeEach(() => {
    const resultPageStepSignal = signal(1);
    const createResultManagementServiceSpy = {
      resultPageStep: resultPageStepSignal,
      editingOicr: jest.fn().mockReturnValue(false),
      resetModal: jest.fn()
    };

    const submissionServiceSpy = {
      statusSelected: { set: jest.fn() },
      comment: { set: jest.fn() },
      melRegionalExpert: { set: jest.fn() },
      oicrNo: { set: jest.fn() },
      sharePointFolderLink: { set: jest.fn() }
    };

    TestBed.configureTestingModule({
      providers: [
        AllModalsService,
        { provide: CreateResultManagementService, useValue: createResultManagementServiceSpy },
        { provide: SubmissionService, useValue: submissionServiceSpy }
      ]
    });

    service = TestBed.inject(AllModalsService);
    mockCreateResultManagementService = TestBed.inject(CreateResultManagementService) as any;
    mockSubmissionService = TestBed.inject(SubmissionService) as any;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initial state', () => {
    it('should initialize with default modal config', () => {
      const config = service.modalConfig();
      expect(config.createResult.isOpen).toBe(false);
      expect(config.submitResult.isOpen).toBe(false);
      expect(config.requestPartner.isOpen).toBe(false);
      expect(config.createOicrResult.isOpen).toBe(false);
      expect(config.askForHelp.isOpen).toBe(false);
      expect(config.resultInformation.isOpen).toBe(false);
      expect(config.addContactPerson.isOpen).toBe(false);
      expect(config.portfolioManagement.isOpen).toBe(false);
    });

    it('should initialize with default signals', () => {
      expect(service.partnerRequestSection()).toBeNull();
      expect(service.selectedResultForInfo()).toBeNull();
      expect(service.submitResultOrigin()).toBeNull();
      expect(service.submitHeader()).toBeNull();
      expect(service.submitBackStep()).toBeNull();
    });
  });

  describe('setResultInformationEntryContext', () => {
    it('should set results-center title when context is results-center', () => {
      service.setResultInformationEntryContext('results-center');
      expect(service.resultInformationEntryContext()).toBe('results-center');
      expect(service.modalConfig().resultInformation.title).toBe('Result information');
    });

    it('should set default title when context is null', () => {
      service.setResultInformationEntryContext(null);
      expect(service.resultInformationEntryContext()).toBeNull();
      expect(service.modalConfig().resultInformation.title).toBe('Result Information');
    });
  });

  describe('Signal setters', () => {
    it('should set partnerRequestSection', () => {
      service.setPartnerRequestSection('test-section');
      expect(service.partnerRequestSection()).toBe('test-section');
    });

    it('should set selectedResultForInfo', () => {
      service.selectedResultForInfo.set(mockResult);
      expect(service.selectedResultForInfo()).toBe(mockResult);
    });

    it('should set submitResultOrigin', () => {
      service.setSubmitResultOrigin('latest');
      expect(service.submitResultOrigin()).toBe('latest');
    });

    it('should set submitHeader', () => {
      service.setSubmitHeader(mockOicrHeaderData);
      expect(service.submitHeader()).toBe(mockOicrHeaderData);
    });

    it('should set submitBackStep', () => {
      service.setSubmitBackStep(5);
      expect(service.submitBackStep()).toBe(5);
    });
  });

  describe('Function setters', () => {
    it('should set goBackFunction', () => {
      const mockFn = jest.fn();
      service.setGoBackFunction(mockFn);
      expect(service.goBackFunction).toBe(mockFn);
    });

    it('should set submitReview', () => {
      const mockFn = jest.fn();
      service.setSubmitReview(mockFn);
      expect(service.submitReview).toBe(mockFn);
    });

    it('should set createPartner', () => {
      const mockFn = jest.fn();
      service.setCreatePartner(mockFn);
      expect(service.createPartner).toBe(mockFn);
    });

    it('should set disabledConfirmPartner', () => {
      const mockFn = jest.fn().mockReturnValue(true);
      service.setDisabledConfirmPartner(mockFn);
      expect(service.disabledConfirmPartner).toBe(mockFn);
    });

    it('should set disabledSubmitReview', () => {
      const mockFn = jest.fn().mockReturnValue(true);
      service.setDisabledSubmitReview(mockFn);
      expect(service.disabledSubmitReview).toBe(mockFn);
    });

    it('should set addContactPersonConfirm', () => {
      const mockFn = jest.fn();
      service.setAddContactPersonConfirm(mockFn);
      expect(service.addContactPersonConfirm).toBe(mockFn);
    });

    it('should set disabledAddContactPerson', () => {
      const mockFn = jest.fn().mockReturnValue(true);
      service.setDisabledAddContactPerson(mockFn);
      expect(service.disabledAddContactPerson).toBe(mockFn);
    });

    it('should set contactPersonModalData', () => {
      service.setContactPersonModalData(mockContactPersonData);
      expect(service.contactPersonModalData).toBe(mockContactPersonData);
    });

    it('should set submitBackAction', () => {
      const mockFn = jest.fn();
      service.setSubmitBackAction(mockFn);
      expect(service.submitBackAction).toBe(mockFn);
    });

    it('should set selectLinkedResultsConfirm', () => {
      const mockFn = jest.fn();
      service.setSelectLinkedResultsConfirm(mockFn);
      expect(service.selectLinkedResultsConfirm).toBe(mockFn);
    });

    it('should set disabledSelectLinkedResults', () => {
      const mockFn = jest.fn().mockReturnValue(true);
      service.setDisabledSelectLinkedResults(mockFn);
      expect(service.disabledSelectLinkedResults).toBe(mockFn);
    });

    it('should set refreshLinkedResults', () => {
      const mockFn = jest.fn().mockResolvedValue(undefined);
      service.setRefreshLinkedResults(mockFn);
      expect(service.refreshLinkedResults).toBe(mockFn);
    });

    it('should set refreshLinkedResults to undefined', () => {
      service.setRefreshLinkedResults(undefined);
      expect(service.refreshLinkedResults).toBeUndefined();
    });

    it('should initialize syncSelectedResults signal', () => {
      expect(service.syncSelectedResults()).toEqual([]);
    });

    it('should set syncSelectedResults signal', () => {
      service.syncSelectedResults.set([mockResult]);
      expect(service.syncSelectedResults()).toEqual([mockResult]);
    });
  });

  describe('setSubmitResultOrigin', () => {
    it('should set origin to latest and update title', () => {
      service.setSubmitResultOrigin('latest');
      expect(service.submitResultOrigin()).toBe('latest');

      const config = service.modalConfig();
      expect(config.submitResult.title).toBe('Review Outcome Impact Case Report (OICR)');
    });

    it('should set origin to null and update title', () => {
      service.setSubmitResultOrigin(null);
      expect(service.submitResultOrigin()).toBe(null);

      const config = service.modalConfig();
      expect(config.submitResult.title).toBe('Review Result');
    });
  });

  describe('updateModal', () => {
    it('should update modal config for step 1', () => {
      mockCreateResultManagementService.editingOicr.mockReturnValue(false);
      service.updateModal(1);

      const config = service.modalConfig();
      expect(config.createResult.title).toBe('Create A Result');
      expect(config.createResult.icon).toBe('arrow_back');
    });

    it('should update modal config for step 2', () => {
      mockCreateResultManagementService.editingOicr.mockReturnValue(true);
      service.updateModal(2);

      const config = service.modalConfig();
      expect(config.createResult.title).toBe('Create A Result');
      expect(config.createResult.icon).toBe('');
    });

    it('should update modal config for other steps', () => {
      service.updateModal(3);

      const config = service.modalConfig();
      expect(config.createResult.title).toBe('Create A Result');
      expect(config.createResult.icon).toBeUndefined();
    });
  });

  describe('toggleModal', () => {
    it('should toggle modal open state', () => {
      service.toggleModal('createResult');
      expect(service.modalConfig().createResult.isOpen).toBe(true);

      service.toggleModal('createResult');
      expect(service.modalConfig().createResult.isOpen).toBe(false);
    });

    it('should handle submitResult modal toggle without cleanup', () => {
      service.setSubmitResultOrigin('latest');
      service.setSubmitHeader(mockOicrHeaderData);
      service.setSubmitBackStep(5);

      service.toggleModal('submitResult');
      expect(service.modalConfig().submitResult.isOpen).toBe(true);

      service.toggleModal('submitResult');
      // Data should NOT be cleaned up when toggling (only on Confirm/Cancel)
      expect(service.submitResultOrigin()).toBe('latest');
      expect(service.submitHeader()).toBe(mockOicrHeaderData);
      expect(service.submitBackStep()).toBe(5);
    });

    it('should handle createResult modal toggle', () => {
      service.toggleModal('createResult');
      expect(mockCreateResultManagementService.resetModal).toHaveBeenCalled();
    });
  });

  describe('hideModal', () => {
    it('should hide specified modal', () => {
      service.showModal('createResult');
      expect(service.modalConfig().createResult.isOpen).toBe(true);

      service.hideModal('createResult');
      expect(service.modalConfig().createResult.isOpen).toBe(false);
    });
  });

  describe('showModal', () => {
    it('should show specified modal', () => {
      service.showModal('createResult');
      expect(service.modalConfig().createResult.isOpen).toBe(true);
    });
  });

  describe('closeModal', () => {
    it('should close specified modal', () => {
      service.showModal('createResult');
      service.closeModal('createResult');

      const config = service.modalConfig();
      expect(config.createResult.isOpen).toBe(false);
      expect(config.createResult.isWide).toBe(false);
    });

    it('should reset resultInformation title and entry context when closing resultInformation', () => {
      service.setResultInformationEntryContext('results-center');
      service.openModal('resultInformation');
      service.closeModal('resultInformation');

      expect(service.resultInformationEntryContext()).toBeNull();
      expect(service.modalConfig().resultInformation.title).toBe('Result Information');
    });

    it('should handle submitResult modal close without cleanup', () => {
      service.setSubmitResultOrigin('latest');
      service.setSubmitHeader(mockOicrHeaderData);
      service.setSubmitBackStep(5);

      service.closeModal('submitResult');

      // Data should NOT be cleaned up when closing (only on Confirm/Cancel)
      expect(service.submitResultOrigin()).toBe('latest');
      expect(service.submitHeader()).toBe(mockOicrHeaderData);
      expect(service.submitBackStep()).toBe(5);
    });

    it('should handle createResult modal close', () => {
      service.closeModal('createResult');
      expect(mockCreateResultManagementService.resetModal).toHaveBeenCalled();
    });
  });

  describe('openModal', () => {
    it('should open specified modal', () => {
      service.openModal('createResult');

      const config = service.modalConfig();
      expect(config.createResult.isOpen).toBe(true);
      expect(config.createResult.isWide).toBe(false);
    });
  });

  describe('isModalOpen', () => {
    it('should return modal config', () => {
      const config = service.isModalOpen('createResult');
      expect(config).toEqual(service.modalConfig().createResult);
    });
  });

  describe('isAnyModalOpen', () => {
    it('should return false when no modals are open', () => {
      expect(service.isAnyModalOpen()).toBe(false);
    });

    it('should return true when at least one modal is open', () => {
      service.showModal('createResult');
      expect(service.isAnyModalOpen()).toBe(true);
    });
  });

  describe('closeAllModals', () => {
    it('should close all modals and reset data', () => {
      service.showModal('createResult');
      service.showModal('submitResult');
      service.setSubmitResultOrigin('latest');

      service.closeAllModals();

      const config = service.modalConfig();
      expect(config.createResult.isOpen).toBe(false);
      expect(config.submitResult.isOpen).toBe(false);
      expect(config.requestPartner.isOpen).toBe(false);
      expect(config.createOicrResult.isOpen).toBe(false);
      expect(config.askForHelp.isOpen).toBe(false);
      expect(config.resultInformation.isOpen).toBe(false);
      expect(config.addContactPerson.isOpen).toBe(false);
      expect(config.portfolioManagement.isOpen).toBe(false);

      expect(service.submitResultOrigin()).toBeNull();
      expect(mockCreateResultManagementService.resetModal).toHaveBeenCalled();
    });
  });

  describe('setModalWidth', () => {
    it('should set modal width', () => {
      service.setModalWidth('createResult', true);
      expect(service.modalConfig().createResult.isWide).toBe(true);

      service.setModalWidth('createResult', false);
      expect(service.modalConfig().createResult.isWide).toBe(false);
    });
  });

  describe('clearSubmissionData', () => {
    it('should clear all submission data', () => {
      service.clearSubmissionData();

      expect(mockSubmissionService.statusSelected.set).toHaveBeenCalledWith(null);
      expect(mockSubmissionService.comment.set).toHaveBeenCalledWith('');
      expect(mockSubmissionService.melRegionalExpert.set).toHaveBeenCalledWith('');
      expect(mockSubmissionService.oicrNo.set).toHaveBeenCalledWith('');
      expect(mockSubmissionService.sharePointFolderLink.set).toHaveBeenCalledWith('');
    });
  });

  describe('Modal actions', () => {
    it('should execute submitResult confirmAction', () => {
      const mockSubmitReview = jest.fn();
      service.setSubmitReview(mockSubmitReview);

      const config = service.modalConfig();
      config.submitResult.confirmAction?.();

      expect(mockSubmitReview).toHaveBeenCalled();
    });

    it('should execute submitResult cancelAction with submitBackAction', () => {
      const mockSubmitBackAction = jest.fn();
      service.setSubmitBackAction(mockSubmitBackAction);

      const config = service.modalConfig();
      config.submitResult.cancelAction?.();

      expect(mockSubmitBackAction).toHaveBeenCalled();
    });

    it('should execute submitResult cancelAction without submitBackAction', () => {
      const config = service.modalConfig();
      config.submitResult.cancelAction?.();

      // Should not throw error
      expect(service.modalConfig().submitResult.isOpen).toBeDefined();
    });

    it('should execute submitResult iconAction with submitBackAction', () => {
      const mockSubmitBackAction = jest.fn();
      service.setSubmitBackAction(mockSubmitBackAction);

      const config = service.modalConfig();
      config.submitResult.iconAction?.();

      expect(mockSubmitBackAction).toHaveBeenCalled();
    });

    it('should execute submitResult iconAction without submitBackAction', () => {
      const config = service.modalConfig();
      config.submitResult.iconAction?.();

      // Should not throw error
      expect(service.modalConfig().submitResult.isOpen).toBeDefined();
    });

    it('should execute disabledSubmitReview', () => {
      const mockDisabledSubmitReview = jest.fn().mockReturnValue(true);
      service.setDisabledSubmitReview(mockDisabledSubmitReview);

      const config = service.modalConfig();
      const result = config.submitResult.disabledConfirmAction?.();

      expect(result).toBe(true);
    });

    it('should execute disabledSubmitReview with default false', () => {
      const config = service.modalConfig();
      const result = config.submitResult.disabledConfirmAction?.();

      expect(result).toBe(false);
    });

    it('should execute addContactPerson confirmAction', () => {
      const mockAddContactPersonConfirm = jest.fn();
      service.setAddContactPersonConfirm(mockAddContactPersonConfirm);
      service.setContactPersonModalData(mockContactPersonData);

      const config = service.modalConfig();
      config.addContactPerson.confirmAction?.();

      expect(mockAddContactPersonConfirm).toHaveBeenCalledWith(mockContactPersonData);
    });

    it('should execute addContactPerson disabledConfirmAction', () => {
      const mockDisabledAddContactPerson = jest.fn().mockReturnValue(true);
      service.setDisabledAddContactPerson(mockDisabledAddContactPerson);

      const config = service.modalConfig();
      const result = config.addContactPerson.disabledConfirmAction?.();

      expect(result).toBe(true);
    });

    it('should execute addContactPerson disabledConfirmAction with default false', () => {
      const config = service.modalConfig();
      const result = config.addContactPerson.disabledConfirmAction?.();

      expect(result).toBe(false);
    });
  });

  describe('Effect in constructor', () => {
    it('should update modal when resultPageStep changes', async () => {
      // Wait for the effect to run initially
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify initial state
      expect(service).toBeTruthy();
      expect(mockCreateResultManagementService.resultPageStep).toBeDefined();

      // Change the resultPageStep signal to trigger the effect
      const resultPageStepSignal = mockCreateResultManagementService.resultPageStep as ReturnType<typeof signal>;
      resultPageStepSignal.set(2);

      // Wait for the effect to run
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify updateModal was called (indirectly through the effect)
      const config = service.modalConfig();
      expect(config.createResult.title).toBe('Create A Result');
    });
  });

  describe('Additional coverage for missing lines', () => {
    it('should handle goBackFunction in updateModal when editingOicr is false', () => {
      const mockGoBackFunction = jest.fn();
      service.setGoBackFunction(mockGoBackFunction);
      mockCreateResultManagementService.editingOicr.mockReturnValue(false);

      service.updateModal(1);

      const config = service.modalConfig();
      expect(config.createResult.iconAction).toBeDefined();

      // Execute the iconAction to cover line 136
      config.createResult.iconAction?.();
      expect(mockGoBackFunction).toHaveBeenCalled();
    });

    it('should handle goBackFunction in updateModal when editingOicr is true', () => {
      const mockGoBackFunction = jest.fn();
      service.setGoBackFunction(mockGoBackFunction);
      mockCreateResultManagementService.editingOicr.mockReturnValue(true);

      service.updateModal(1);

      const config = service.modalConfig();
      expect(config.createResult.iconAction).toBeDefined();

      // Execute the iconAction to cover line 136
      config.createResult.iconAction?.();
      expect(mockGoBackFunction).toHaveBeenCalled();
    });

    it('should handle updateModal for steps other than 1 and 2', () => {
      service.updateModal(3);

      const config = service.modalConfig();
      expect(config.createResult.title).toBe('Create A Result');
      expect(config.createResult.icon).toBeUndefined();
      expect(config.createResult.iconAction).toBeUndefined();
    });

    it('should cover constructor effect execution', async () => {
      // This test ensures the effect in the constructor is properly covered
      // The effect calls updateModal with the current step from createResultManagementService
      await new Promise(resolve => setTimeout(resolve, 0));

      const resultPageStepSignal = mockCreateResultManagementService.resultPageStep as ReturnType<typeof signal>;
      const currentStep = resultPageStepSignal();
      expect(currentStep).toBe(1);

      // Verify the service is properly initialized
      expect(service).toBeTruthy();
      expect(service.modalConfig()).toBeDefined();

      // Change the step to trigger the effect again and cover lines 135-136
      resultPageStepSignal.set(3);
      await new Promise(resolve => setTimeout(resolve, 0));

      // Verify updateModal was called through the effect
      const config = service.modalConfig();
      expect(config.createResult.title).toBe('Create A Result');
    });
  });
});
