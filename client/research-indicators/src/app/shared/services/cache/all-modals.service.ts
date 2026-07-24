import { effect, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { CreateResultManagementService } from '@shared/components/all-modals/modals-content/create-result-modal/services/create-result-management.service';
import { Result } from '@shared/interfaces/result/result.interface';
import { ModalName } from '@ts-types/modal.types';
import { OicrHeaderData } from '@shared/interfaces/oicr-header-data.interface';
import { SubmissionService } from '@shared/services/submission.service';
import { ModalActionWithData, ModalDisabledAction } from '@shared/interfaces/modal.interface';
import { ContactPersonFormData } from '@shared/interfaces/contact-person.interface';

interface ModalConfig {
  isOpen: boolean;
  title: string;
  icon?: string;
  cancelText?: string;
  confirmText?: string;
  confirmIcon?: string;
  iconAction?: () => void;
  cancelAction?: () => void;
  confirmAction?: () => void;
  disabledConfirmAction?: () => boolean;
  isWide?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AllModalsService {
  partnerRequestSection = signal<string | null>(null);
  selectedResultForInfo = signal<Result | null>(null);
  resultInformationEntryContext = signal<'results-center' | null>(null);
  submitResultOrigin = signal<'latest' | null>(null);
  submitHeader = signal<OicrHeaderData | null>(null);
  submitBackStep = signal<number | null>(null);
  disablePostponeOption = signal<boolean>(false);
  disableRejectOption = signal<boolean>(false);
  createResultManagementService = inject(CreateResultManagementService);
  submissionService = inject(SubmissionService);
  goBackFunction?: () => void;
  setGoBackFunction = (fn: () => void) => (this.goBackFunction = fn);
  submitReview?: () => void;
  setSubmitReview = (fn: () => void) => (this.submitReview = fn);
  createPartner?: () => void;
  setCreatePartner = (fn: () => void) => (this.createPartner = fn);
  disabledConfirmPartner?: () => boolean;
  setDisabledConfirmPartner = (fn: () => boolean) => (this.disabledConfirmPartner = fn);
  disabledSubmitReview?: () => boolean;
  setDisabledSubmitReview = (fn: () => boolean) => (this.disabledSubmitReview = fn);
  addContactPersonConfirm?: ModalActionWithData;
  setAddContactPersonConfirm = (fn: ModalActionWithData) => (this.addContactPersonConfirm = fn);
  disabledAddContactPerson?: ModalDisabledAction;
  setDisabledAddContactPerson = (fn: ModalDisabledAction) => (this.disabledAddContactPerson = fn);
  contactPersonModalData?: ContactPersonFormData;
  setContactPersonModalData = (data: ContactPersonFormData) => (this.contactPersonModalData = data);
  selectLinkedResultsConfirm?: () => void;
  setSelectLinkedResultsConfirm = (fn: () => void) => (this.selectLinkedResultsConfirm = fn);
  disabledSelectLinkedResults?: () => boolean;
  setDisabledSelectLinkedResults = (fn: () => boolean) => (this.disabledSelectLinkedResults = fn);
  refreshLinkedResults?: () => Promise<void> | void;
  setRefreshLinkedResults = (fn: (() => Promise<void> | void) | undefined) => (this.refreshLinkedResults = fn);
  syncSelectedResults = signal<Result[]>([]);
  setResultInformationEntryContext(context: 'results-center' | null): void {
    this.resultInformationEntryContext.set(context);
    this.modalConfig.update(modals => ({
      ...modals,
      resultInformation: {
        ...modals.resultInformation,
        title: context === 'results-center' ? 'Result information' : 'Result Information'
      }
    }));
  }

  setSubmitResultOrigin(origin: 'latest' | null): void {
    this.submitResultOrigin.set(origin);
    const title = origin === 'latest' ? 'Review Outcome Impact Case Report (OICR)' : 'Review Result';
    this.modalConfig.update(modals => ({
      ...modals,
      submitResult: {
        ...modals.submitResult,
        title
      }
    }));
  }

  setSubmitHeader(header: OicrHeaderData | null): void {
    this.submitHeader.set(header);
  }

  setSubmitBackStep(step: number | null): void {
    this.submitBackStep.set(step);
  }

  submitBackAction?: () => void;
  setSubmitBackAction = (fn: () => void) => (this.submitBackAction = fn);

  modalConfig: WritableSignal<Record<ModalName, ModalConfig>> = signal({
    createResult: {
      isOpen: false,
      title: 'Create a result'
    },
    submitResult: {
      isOpen: false,
      title: 'Review Result',
      cancelText: 'Cancel',
      confirmText: 'Confirm',
      cancelAction: () => this.submitBackAction?.() ?? this.toggleModal('submitResult'),
      confirmAction: () => this.submitReview?.(),
      disabledConfirmAction: () => this.disabledSubmitReview?.() ?? false,
      iconAction: () => this.submitBackAction?.() ?? this.toggleModal('submitResult')
    },
    requestPartner: {
      isOpen: false,
      title: 'Partners Request'
      // disabledConfirmAction: () => this.disabledConfirmPartner?.() ?? false
    },
    createOicrResult: {
      isOpen: false,
      title: 'Outcome Impact Case Report (OICR)'
    },
    askForHelp: {
      isOpen: false,
      title: 'Ask for Help'
    },
    resultInformation: {
      isOpen: false,
      title: 'Result Information'
    },
    addContactPerson: {
      isOpen: false,
      title: 'Authors And Contact Persons',
      cancelText: 'Cancel',
      confirmText: 'Confirm',
      confirmIcon: 'pi pi-arrow-right !text-[12px]',
      confirmAction: () => this.addContactPersonConfirm?.(this.contactPersonModalData!),
      disabledConfirmAction: () => this.disabledAddContactPerson?.() ?? false,
      isWide: true
    },
    selectLinkedResults: {
      isOpen: false,
      title: 'Existing Results',
      isWide: true
    },
    editEnvironmentVariable: {
      isOpen: false,
      title: 'Environment variables'
    },
    portfolioManagement: {
      isOpen: false,
      title: 'Portfolio management'
    }
  });

  constructor() {
    effect(() => {
      const step = this.createResultManagementService.resultPageStep();
      this.updateModal(step);
    });
  }

  setPartnerRequestSection(section: string) {
    this.partnerRequestSection.set(section);
  }

  updateModal(step: number): void {
    this.modalConfig.update(modal => {
      modal.createResult = {
        isOpen: modal.createResult.isOpen,
        title: 'Create A Result',
        ...(step === 1 || step === 2
          ? { iconAction: () => this.goBackFunction?.(), icon: !this.createResultManagementService.editingOicr() ? 'arrow_back' : '' }
          : {})
      };
      return modal;
    });
  }

  toggleModal(modalName: ModalName): void {
    this.modalConfig.update(modals => ({
      ...modals,
      [modalName]: {
        ...modals[modalName],
        isOpen: !modals[modalName]?.isOpen,
        isWide: false
      }
    }));

    if (modalName === 'createResult') {
      this.createResultManagementService.resetModal();
    }
  }

  hideModal(modalName: ModalName): void {
    this.modalConfig.update(modals => ({
      ...modals,
      [modalName]: {
        ...modals[modalName],
        isOpen: false
      }
    }));
  }

  showModal(modalName: ModalName): void {
    this.modalConfig.update(modals => ({
      ...modals,
      [modalName]: {
        ...modals[modalName],
        isOpen: true
      }
    }));
  }

  closeModal(modalName: ModalName): void {
    this.modalConfig.update(modals => {
      const next = {
        ...modals,
        [modalName]: {
          ...modals[modalName],
          isOpen: false,
          isWide: false
        }
      };
      if (modalName === 'resultInformation') {
        next.resultInformation = { ...next.resultInformation, title: 'Result Information' };
      }
      return next;
    });

    if (modalName === 'createResult') {
      this.createResultManagementService.resetModal();
    }

    if (modalName === 'resultInformation') {
      this.resultInformationEntryContext.set(null);
    }
  }

  openModal(modalName: ModalName): void {
    this.modalConfig.update(modals => ({
      ...modals,
      [modalName]: {
        ...modals[modalName],
        isOpen: true,
        isWide: false
      }
    }));
  }

  isModalOpen(modalName: ModalName): ModalConfig {
    return this.modalConfig()[modalName];
  }

  isAnyModalOpen(): boolean {
    return Object.values(this.modalConfig()).some(value => value.isOpen);
  }

  closeAllModals(): void {
    this.modalConfig.set({
      createResult: { ...this.modalConfig().createResult, isOpen: false, isWide: false },
      submitResult: { ...this.modalConfig().submitResult, isOpen: false, isWide: false },
      requestPartner: { ...this.modalConfig().requestPartner, isOpen: false, isWide: false },
      createOicrResult: { ...this.modalConfig().createOicrResult, isOpen: false, isWide: false },
      askForHelp: { ...this.modalConfig().askForHelp, isOpen: false, isWide: false },
      resultInformation: { ...this.modalConfig().resultInformation, isOpen: false, isWide: false, title: 'Result Information' },
      addContactPerson: { ...this.modalConfig().addContactPerson, isOpen: false, isWide: false },
      selectLinkedResults: { ...this.modalConfig().selectLinkedResults, isOpen: false, isWide: false },
      editEnvironmentVariable: { ...this.modalConfig().editEnvironmentVariable, isOpen: false, isWide: false },
      portfolioManagement: { ...this.modalConfig().portfolioManagement, isOpen: false, isWide: false }
    });

    this.setSubmitResultOrigin(null);
    this.clearSubmissionData();
    this.refreshLinkedResults = undefined;
    this.resultInformationEntryContext.set(null);

    this.createResultManagementService.resetModal();
  }

  setModalWidth(modalName: ModalName, isWide: boolean): void {
    this.modalConfig.update(modals => ({
      ...modals,
      [modalName]: {
        ...modals[modalName],
        isWide
      }
    }));
  }

  clearSubmissionData(): void {
    this.submissionService.statusSelected.set(null);
    this.submissionService.comment.set('');
    this.submissionService.melRegionalExpert.set('');
    this.submissionService.oicrNo.set('');
    this.submissionService.sharePointFolderLink.set('');
  }
}
