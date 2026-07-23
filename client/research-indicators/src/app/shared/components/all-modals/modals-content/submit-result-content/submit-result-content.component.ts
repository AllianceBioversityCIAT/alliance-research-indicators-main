import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { InputTextModule } from 'primeng/inputtext';
import { AllModalsService } from '@services/cache/all-modals.service';
import { GetMetadataService } from '@shared/services/get-metadata.service';
import { ApiService } from '@shared/services/api.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { ReviewOption } from '../../../../interfaces/review-option.interface';
import { SubmissionService } from '../../../../services/submission.service';
import { ActionsService } from '@shared/services/actions.service';
import { Router } from '@angular/router';
import { SelectComponent } from '@shared/components/custom-fields/select/select.component';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { OicrHeaderComponent } from '@shared/components/oicr-header/oicr-header.component';
import { PatchSubmitResultLatest } from '@shared/interfaces/patch_submit-result.interface';
import { CurrentResultService } from '@shared/services/cache/current-result.service';
import { ProjectResultsTableService } from '@shared/components/project-results-table/project-results-table.service';
import { ResultsCenterService } from '@pages/platform/pages/results-center/results-center.service';
import { ResultStatus } from '@shared/interfaces/result-config.interface';
import { CreateResultManagementService } from '../create-result-modal/services/create-result-management.service';

@Component({
  selector: 'app-submit-result-content',
  imports: [DialogModule, ButtonModule, FormsModule, TextareaModule, InputTextModule, SelectComponent, InputComponent, OicrHeaderComponent],
  templateUrl: './submit-result-content.component.html'
})
export class SubmitResultContentComponent {
  allModalsService = inject(AllModalsService);
  metadata = inject(GetMetadataService);
  cache = inject(CacheService);
  api = inject(ApiService);
  submissionService = inject(SubmissionService);
  actions = inject(ActionsService);
  currentResultService = inject(CurrentResultService);
  projectResultsTableService = inject(ProjectResultsTableService);
  resultsCenterService = inject(ResultsCenterService);
  private readonly router = inject(Router);
  createResultManagementService = inject(CreateResultManagementService);
  form = signal<PatchSubmitResultLatest>({ mel_regional_expert: '', oicr_internal_code: '', sharepoint_link: '' });
  statusData = signal<Record<number, ResultStatus>>({});

  headerData = computed(() => {
    const base = this.allModalsService.submitHeader();
    if (!base) return null;

    if (this.allModalsService.submitResultOrigin?.() === 'latest') {
      const currentMetadata = this.cache.currentMetadata();
      const currentStatusId = currentMetadata?.status_id;
      const resultStatus = currentMetadata?.result_status;
      const resultOfficialCode = currentMetadata?.result_official_code;
      const headerWithCode =
        resultOfficialCode !== null && resultOfficialCode !== undefined
          ? { ...base, result_official_code: resultOfficialCode }
          : base;
      
      if (currentStatusId != null && resultStatus) {
        return {
          ...headerWithCode,
          status_id: String(currentStatusId),
          status_config: resultStatus
        };
      }

      return headerWithCode;
    }

    return base;
  });

  constructor() {
    this.allModalsService.setSubmitReview(() => this.submitReview());
    this.allModalsService.setDisabledSubmitReview(() => this.disabledConfirmSubmit());

    let wasVisible = false;
    effect(() => {
      const visible = this.allModalsService.modalConfig().submitResult.isOpen;
      if (!wasVisible && visible) {
        this.setInitialSelectedReviewOption();
        this.form.set({
          mel_regional_expert: this.submissionService.melRegionalExpert(),
          oicr_internal_code: this.submissionService.oicrNo(),
          sharepoint_link: this.submissionService.sharePointFolderLink()
        });
        this.loadStatuses();
      }
      if (wasVisible && !visible) {
        // Reset disabled options when modal closes
        this.allModalsService.disablePostponeOption.set(false);
        this.allModalsService.disableRejectOption.set(false);
      }
      wasVisible = visible;
    });
  }

  private async loadStatuses(): Promise<void> {
    const statusMap: Record<number, ResultStatus> = {};
    const isLatest = this.allModalsService.submitResultOrigin?.() === 'latest';
    const statusIdsToLoad = isLatest ? [10, 11, 15] : [6, 5, 7];
    
    for (const statusId of statusIdsToLoad) {
      try {
        const response = await this.api.GET_ResultStatus(statusId);
        if (response.successfulRequest && response.data) {
          statusMap[statusId] = response.data;
        }
      } catch (error) {
        console.error(`Error loading status for statusId ${statusId}:`, error);
      }
    }
    this.statusData.set(statusMap);
  }
  setInitialSelectedReviewOption(): void {
    const currentStatusId = this.cache.currentMetadata()?.status_id;
    if (currentStatusId == null) return;

    const matchingOption = this.reviewOptions().find(option => option.statusId === currentStatusId);
    
    if (matchingOption && !matchingOption.disabled) {
      this.submissionService.statusSelected.set(matchingOption);
    } else {
      this.submissionService.statusSelected.set(null);
    }
  }

  private readonly baseReviewOptions: ReviewOption[] = [
    {
      key: 'approve',
      label: '',
      description: '',
      icon: 'pi-check-circle',
      color: 'text-[#509C55]',
      message: 'Once this result is approved, no further changes will be allowed.',
      commentLabel: undefined,
      placeholder: '',
      statusId: 6,
      selected: false
    },
    {
      key: 'revise',
      label: '',
      description: '',
      icon: 'pi-minus-circle',
      color: 'text-[#e69f00]',
      message: 'The result submitter will address the provided recommendations and resubmit for review.',
      commentLabel: 'Add recommendations/comments',
      placeholder: '',
      statusId: 5,
      selected: false
    },
    {
      key: 'reject',
      label: '',
      description: '',
      icon: 'pi-times-circle',
      color: 'text-[#cf0808]',
      message: 'If the result is rejected, it can no longer be edited or resubmitted.',
      commentLabel: 'Add the reject reason',
      placeholder: '',
      statusId: 7,
      selected: false
    }
  ];

  reviewOptions = computed<ReviewOption[]>(() => {
    const isLatest = this.allModalsService.submitResultOrigin?.() === 'latest';
    const disablePostpone = this.allModalsService.disablePostponeOption?.() ?? false;
    const disableReject = this.allModalsService.disableRejectOption?.() ?? false;
    const statusMap = this.statusData();
    return this.baseReviewOptions.map(opt => {
      const status = statusMap[opt.statusId];
      const label = status?.name ?? opt.label;
      const description = status?.action_description ?? opt.description;
      const baseOpt = { ...opt, label, description };
      
      if (!isLatest) return baseOpt;
      if (opt.key === 'approve') {
        const approveStatus = statusMap[10];
        const approveLabel = approveStatus?.name ?? baseOpt.label;
        const approveDescription = approveStatus?.action_description ?? baseOpt.description;
        return { ...baseOpt, label: approveLabel, description: approveDescription, statusId: 10 };
      }
      if (opt.key === 'revise') {
        const postponeStatus = statusMap[11];
        const postponeLabel = postponeStatus?.name ?? '';
        const postponeDescription = postponeStatus?.action_description ?? baseOpt.description;
        return { 
          ...baseOpt, 
          label: postponeLabel, 
          description: postponeDescription, 
          commentLabel: 'Justification', 
          placeholder: 'Please briefly elaborate your decision', 
          statusId: 11,
          disabled: disablePostpone
        };
      }
      if (opt.key === 'reject') {
        const rejectStatus = statusMap[15];
        const rejectLabel = rejectStatus?.name ?? 'Do not approve';
        const rejectDescription = rejectStatus?.action_description ?? baseOpt.description;
        return { ...baseOpt, label: rejectLabel, description: rejectDescription, commentLabel: 'Justification', placeholder: 'Please briefly elaborate your decision', statusId: 15, disabled: disableReject };
      }
      return baseOpt;
    });
  });

  submittionOptions = computed(() =>
    this.reviewOptions().map(option => ({ ...option, selected: option.statusId === this.submissionService.statusSelected()?.statusId }))
  );

  setComment = (event: Event) => this.submissionService.comment.set((event.target as HTMLTextAreaElement).value);

  selectOption(option: ReviewOption): void {
    if (option.disabled) return;
    this.submissionService.statusSelected.set(option);
  }

  onOptionFocus(option: ReviewOption): void {
    for (const opt of this.submittionOptions()) {
      const element = document.querySelector(`[data-option-key="${opt.key}"]`) as HTMLElement;
      if (element) {
        element.setAttribute('tabindex', opt.key === option.key ? '0' : '-1');
      }
    }
  }

  onOptionKeydown(event: KeyboardEvent, option: ReviewOption, index: number): void {
    const options = this.submittionOptions();
    const currentIndex = index;
    
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % options.length;
        this.focusNextEnabledOption(options, nextIndex, 1);
        break;
      }
        
      case 'ArrowLeft':
      case 'ArrowUp': {
        event.preventDefault();
        const prevIndex = currentIndex === 0 ? options.length - 1 : currentIndex - 1;
        this.focusNextEnabledOption(options, prevIndex, -1);
        break;
      }
        
      case ' ':
      case 'Enter':
        event.preventDefault();
        if (!option.disabled) {
          this.selectOption(option);
        }
        break;
        
      case 'Home': {
        event.preventDefault();
        const firstEnabled = options.findIndex(opt => !opt.disabled);
        if (firstEnabled !== -1) {
          this.focusOption(options[firstEnabled]);
        }
        break;
      }
        
      case 'End': {
        event.preventDefault();
        let lastEnabled = -1;
        for (let i = options.length - 1; i >= 0; i--) {
          if (!options[i].disabled) {
            lastEnabled = i;
            break;
          }
        }
        if (lastEnabled !== -1) {
          this.focusOption(options[lastEnabled]);
        }
        break;
      }
    }
  }

  private focusNextEnabledOption(options: ReviewOption[], startIndex: number, direction: number): void {
    let currentIndex = startIndex;
    const maxAttempts = options.length;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      if (!options[currentIndex].disabled) {
        this.focusOption(options[currentIndex]);
        return;
      }
      currentIndex = (currentIndex + direction + options.length) % options.length;
      attempts++;
    }
  }

  private focusOption(option: ReviewOption): void {
    const element = document.querySelector(`[data-option-key="${option.key}"]`) as HTMLElement;
    if (element) {
      element.focus();
    }
  }


  updateForm<K extends keyof PatchSubmitResultLatest>(key: K, value: PatchSubmitResultLatest[K]): void {
    this.form.update(f => ({ ...f, [key]: value }));
  }

  disabledConfirmSubmit = (): boolean => {
    const selected = this.submissionService.statusSelected();
    const comment = this.submissionService.comment();
    const isLatest = this.allModalsService.submitResultOrigin?.() === 'latest';
    const commentRequired = !!selected?.commentLabel && !comment?.trim();
    
    if (!selected) return true;
    
    if (isLatest && selected?.statusId === 10) {
      const form = this.form();
      const allFieldsFilled = form.mel_regional_expert?.trim() && form.oicr_internal_code?.trim();
      const sharepointLink = form.sharepoint_link?.trim();
      const validSharepoint = !sharepointLink || this.validateWebsite(sharepointLink);
      return commentRequired || !allFieldsFilled || !validSharepoint;
    }
    
    return commentRequired;
  };

  private async refreshTables(): Promise<void> {
    try {
      if (this.projectResultsTableService.contractId) {
        await this.projectResultsTableService.getData();
      }
      await this.resultsCenterService.main();
    } catch (error) {
      console.error('Error refreshing tables:', error);
    }
  }

  private buildLatestBody(isApprove: boolean, formValue: PatchSubmitResultLatest): PatchSubmitResultLatest | undefined {
    if (!isApprove) return undefined;
    return {
      oicr_internal_code: formValue?.oicr_internal_code || '',
      mel_regional_expert: formValue?.mel_regional_expert || '',
      sharepoint_link: formValue?.sharepoint_link || ''
    };
  }

  private async handlePostSubmitForLegacyFlow(): Promise<boolean> {
    const response = await this.api.PATCH_SubmitResult({
      resultCode: this.cache.getCurrentNumericResultId(),
      comment: this.submissionService.comment(),
      status: this.submissionService.statusSelected()!.statusId
    });
    if (!response.successfulRequest) return false;
    if (this.submissionService.statusSelected()?.statusId === 6) this.submissionService.comment.set('');
    await this.metadata.update(this.cache.getCurrentNumericResultId());
    this.cache.lastResultId.set(null);
    this.cache.lastVersionParam.set(null);
    this.cache.liveVersionData.set(null);
    this.cache.versionsList.set([]);
    const currentPath = this.router.url.split('?')[0];
    await this.router.navigate([currentPath], { queryParams: {}, replaceUrl: true });

    await new Promise(resolve => setTimeout(resolve, 100));

    if (this.submissionService.statusSelected()?.statusId === 6) {
      const versionsResponse = await this.api.GET_Versions(this.cache.getCurrentNumericResultId());
      const versions = Array.isArray(versionsResponse.data.versions) ? versionsResponse.data.versions : [];
      this.cache.versionsList.set(versions);
      if (versions.length > 0) {
        await this.router.navigate([currentPath], {
          queryParams: { version: versions[0].report_year_id },
          replaceUrl: true
        });
      }
    }
    return true;
  }

  validateWebsite(url?: string): boolean {
    if (!url) {
      return false;
    }
    const websitePattern = /^(https?:\/\/)?(www\.)?([\da-z-]+\.)+[a-z]{2,}(\/\S*)?$/i;
    return websitePattern.test(url);
  }

  async submitReview(): Promise<void> {
    if (this.allModalsService.submitResultOrigin?.() === 'latest') {
      const isApprove = this.submissionService.statusSelected()?.statusId === 10;
      const formValue = this.form();
      const body = this.buildLatestBody(isApprove, formValue);
      const response = await this.api.PATCH_SubmitResult(
        {
          resultCode: this.cache.getCurrentNumericResultId(),
          comment: this.submissionService.comment(),
          status: this.submissionService.statusSelected()!.statusId
        },
        body
      );
      
      if (!response.successfulRequest) return;
      
      this.form.set({ mel_regional_expert: '', oicr_internal_code: '', sharepoint_link: '' });
      this.submissionService.comment.set('');
      this.submissionService.statusSelected.set(null);
      
  this.cleanUpSubmitResultData();
      
      this.allModalsService.closeModal('submitResult');
      await this.refreshTables();
      this.actions.showGlobalAlert({
        severity: 'success',
        summary: 'Review submitted successfully',
        hasNoCancelButton: true,
        detail: 'Your review has been submitted and the OICR development process will continue with backstopping from the PISA-SPRM team.',
        confirmCallback: {
          label: 'Done',
          event: () => {
            this.allModalsService.closeAllModals();
          }
        }
      });
    }
    else {
      const success = await this.handlePostSubmitForLegacyFlow();
      if (success) {
        this.allModalsService.closeModal('submitResult');
      }
    }
  }

  private cleanUpSubmitResultData(): void {
    // Clean up all data when confirming
    this.allModalsService.setSubmitResultOrigin(null);
    this.allModalsService.setSubmitHeader(null);
    this.allModalsService.setSubmitBackStep(null);
    this.allModalsService.clearSubmissionData();
    this.allModalsService.submitBackAction = undefined;
    this.allModalsService.createResultManagementService.resetModal();

    this.createResultManagementService.currentRequestedResultCode.set(null);
    this.cache.projectResultsSearchValue.set(this.createResultManagementService.createOicrBody().base_information.title);
    this.createResultManagementService.clearOicrBody();
    this.createResultManagementService.setStatusId(null);
    this.createResultManagementService.editingOicr.set(false);
    this.createResultManagementService.autofillinOicr.set(false);
    this.createResultManagementService.currentRequestedResultCode.set(null);
    this.createResultManagementService.year.set(null);
    this.createResultManagementService.oicrPrimaryOptionsDisabled.set([]);
    this.createResultManagementService.clearOicrBody();
  };
}
