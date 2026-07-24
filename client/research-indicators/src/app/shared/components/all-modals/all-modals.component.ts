import { Component, computed, inject } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';
import { CreateResultModalComponent } from './modals-content/create-result-modal/create-result-modal.component';
import { CreateResultManagementService } from './modals-content/create-result-modal/services/create-result-management.service';
import { SubmitResultContentComponent } from './modals-content/submit-result-content/submit-result-content.component';
import { SubmissionService } from '../../services/submission.service';
import { RequestPartnerModalComponent } from './modals-content/request-partner-modal/request-partner-modal.component';
import { AskForHelpModalComponent } from './modals-content/ask-for-help-modal/ask-for-help-modal/ask-for-help-modal.component';
import { ResultInformationModalComponent } from './modals-content/result-information-modal/result-information-modal.component';
import { AddContactPersonModalComponent } from './modals-content/add-contact-person-modal/add-contact-person-modal.component';
import { SelectLinkedResultsModalComponent } from './modals-content/select-linked-results-modal/select-linked-results-modal.component';
import { EditEnvironmentVariableModalComponent } from './modals-content/edit-environment-variable-modal/edit-environment-variable-modal.component';

@Component({
  selector: 'app-all-modals',
  imports: [
    ModalComponent,
    CreateResultModalComponent,
    RequestPartnerModalComponent,
    SubmitResultContentComponent,
    AskForHelpModalComponent,
    ResultInformationModalComponent,
    AddContactPersonModalComponent,
    SelectLinkedResultsModalComponent,
    EditEnvironmentVariableModalComponent
  ],
  templateUrl: './all-modals.component.html'
})
export class AllModalsComponent {
  createResultManagementService = inject(CreateResultManagementService);
  submissionService = inject(SubmissionService);
  disabledConfirmIf = computed(() => {
    if (!this.submissionService.statusSelected()?.statusId) return true;

    switch (this.submissionService.statusSelected()?.statusId) {
      case 5:
        return this.submissionService.comment() === '';
      case 6:
        return false;
      case 7:
        return this.submissionService.comment() === '';
      default:
        return true;
    }
  });

  clearModal = () => {
    this.createResultManagementService.currentRequestedResultCode.set(null);
    this.createResultManagementService.editingOicr.set(false);
    this.createResultManagementService.clearOicrBody();
    setTimeout(() => {
      this.createResultManagementService.resultPageStep.set(0);
    }, 300);
  };
}
