import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { AllModalsService } from '../../../../../services/cache/all-modals.service';
import { ActionsService } from '../../../../../services/actions.service';
import { ApiService } from '../../../../../services/api.service';
import { AskForHelp } from '../interfaces/ask-for-help.interface';
import { CacheService } from '../../../../../services/cache/cache.service';
import { getBrowserInfo } from '../../../../../utils/browser.util';
import { CommonModule } from '@angular/common';

interface FormBody {
  type: string;
  message: string;
}

@Component({
  selector: 'app-ask-for-help-modal',
  imports: [FormsModule, SelectModule, InputTextModule, ButtonModule, TextareaModule, CommonModule],
  templateUrl: './ask-for-help-modal.component.html',
  styleUrl: './ask-for-help-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AskForHelpModalComponent {
  body = signal<FormBody>({ type: '', message: '' });
  modalService = inject(AllModalsService);
  actions = inject(ActionsService);

  loading = signal(false);
  supportTypes = [
    {
      title: 'Technical Support – For issues related to platform functionality, errors, or performance problems.',
      value: 'technical-support'
    },
    {
      title: 'Content Support – For questions or guidance on how to input or report results information in STAR.',
      value: 'content-support'
    }
  ];

  cache = inject(CacheService);
  api = inject(ApiService);

  validateForm() {
    const { type, message } = this.body();
    return type && message && message.length >= 25;
  }

  resetModal() {
    this.body.set({ type: '', message: '' });
    this.modalService.closeModal('askForHelp');
  }

  async sendRequest() {
    const browserInfo = getBrowserInfo();

    const sendData: AskForHelp = {
      type: this.body().type,
      message: this.body().message,
      url: this.cache.currentUrlPath(),
      metadata: this.cache.currentMetadata(),
      userData: this.cache.dataCache().user,
      currentResultId: this.cache.getCurrentNumericResultId(),
      currentRouteTitle: this.cache.currentRouteTitle(),
      windowWidth: this.cache.windowWidth(),
      windowHeight: this.cache.windowHeight(),
      browserInfo
    };

    const response = await this.api.PATCH_Feedback(sendData);

    if (!response.successfulRequest) {
      this.actions.showGlobalAlert({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to send request',
        cancelCallback: {
          label: 'Close'
        },
        autoHideDuration: 2000,
        hideCancelButton: true
      });
      this.resetModal();
      return;
    }

    this.actions.showGlobalAlert({
      severity: 'success',
      summary: 'HELP REQUEST SUBMITTED',
      detail: 'We&apos;ve received your request and will get back to you as soon as possible.',
      cancelCallback: {
        label: 'Close'
      },
      autoHideDuration: 2000,
      hideCancelButton: true
    });

    this.resetModal();
  }
}
