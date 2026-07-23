import { Component, computed, inject, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CacheService } from '../../services/cache/cache.service';
import { GreenChecks } from '../../interfaces/get-green-checks.interface';
import { CommonModule } from '@angular/common';
import { ActionsService } from '@shared/services/actions.service';
import { TooltipModule } from 'primeng/tooltip';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { ApiService } from '../../services/api.service';
import { GetMetadataService } from '../../services/get-metadata.service';
import { SubmissionService } from '../../services/submission.service';
import { CustomTagComponent } from '../custom-tag/custom-tag.component';
import { StatusDropdownComponent } from '../status-dropdown/status-dropdown.component';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';
import { RolesService } from '@shared/services/cache/roles.service';
import { GlobalAlert } from '@shared/interfaces/global-alert.interface';
import { CurrentResultService } from '@shared/services/cache/current-result.service';
import { BilateralService } from '@shared/services/bilateral.service';
import { AlignmentResponse } from '@interfaces/bilateral/pool-funding-alignment.interface';
import {
  isHomeEntryFromUrl,
  isResultsCenterEntryFromUrl,
  RESULT_ENTRY_SOURCE_QUERY,
  RESULT_ENTRY_SOURCE_VALUE_HOME,
  RESULT_ENTRY_SOURCE_VALUE_RESULTS_CENTER
} from '@shared/constants/result-entry-source';

interface SubmissionAlertData {
  severity: 'success' | 'warning';
  summary: string;
  detail: string;
  placeholder: string;
}
interface SidebarOption {
  label: string;
  path: string;
  indicator_id?: number;
  disabled?: boolean;
  underConstruction?: boolean;
  hide?: boolean;
  greenCheckKey: string;
  greenCheck?: boolean;
  /** Optional sections render under a divider and don't count toward completion or gate submission (AR.3). */
  optional?: boolean;
}

@Component({
  selector: 'app-result-sidebar',
  imports: [CustomTagComponent, StatusDropdownComponent, RouterLink, RouterLinkActive, ButtonModule, CommonModule, TooltipModule, S3ImageUrlPipe],
  templateUrl: './result-sidebar.component.html',
  styleUrl: './result-sidebar.component.scss'
})
export class ResultSidebarComponent {
  cache = inject(CacheService);
  actions = inject(ActionsService);
  allModalsService = inject(AllModalsService);
  api = inject(ApiService);
  metadata = inject(GetMetadataService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  submissionService = inject(SubmissionService);
  roles = inject(RolesService);
  currentResultService = inject(CurrentResultService);
  bilateralService = inject(BilateralService);
  private readonly publishedOicrStatusId = 14;

  allOptionsWithGreenChecks = computed(() => {
    const alignment = this.bilateralService.currentAlignment();
    return this.allOptions()
      .filter(
        option =>
          (option?.indicator_id === this.cache.currentMetadata()?.indicator_id || !option?.indicator_id) &&
          !this.shouldHidePoolFundingTab(option, alignment)
      )
      .map(option => ({
        ...option,
        greenCheck: Boolean(this.cache.greenChecks()[option.greenCheckKey as keyof GreenChecks])
      }));
  });

  private shouldHidePoolFundingTab(option: SidebarOption, alignment: AlignmentResponse | null): boolean {
    if (option.path !== 'pool-funding-alignment') return false;
    return !alignment || alignment.eligible === false;
  }

  /** Optional sections (AR.3) — excluded from the progress counter and from submit gating. */
  private countsTowardSectionCompletion(option: SidebarOption): boolean {
    return !option.optional;
  }

  /** Caption + tooltip for the optional-sections group divider in the sidebar. */
  readonly OPTIONAL_GROUP_LABEL = 'Optional';
  readonly OPTIONAL_GROUP_TOOLTIP = 'This section does not count toward completed sections and is not required to submit the result.';

  showOicrStatusDropdown = computed(() => {
    const meta = this.cache.currentMetadata();
    return this.roles.isAdmin() && meta.indicator_id === 5 && meta.status_id !== this.publishedOicrStatusId;
  });

  getResultChildQueryParams(): Record<string, string> {
    const m = this.route.snapshot.queryParamMap;
    const o: Record<string, string> = {};
    const v = m.get('version');
    const f = m.get('from');
    if (v) o['version'] = v;
    if (f === RESULT_ENTRY_SOURCE_VALUE_RESULTS_CENTER || f === RESULT_ENTRY_SOURCE_VALUE_HOME) {
      o[RESULT_ENTRY_SOURCE_QUERY] = f;
    }
    return o;
  }

  allOptions: WritableSignal<SidebarOption[]> = signal([
    {
      label: 'General information',
      path: 'general-information',
      greenCheckKey: 'general_information'
    },
    {
      label: 'Alliance alignment',
      path: 'alliance-alignment',
      greenCheckKey: 'alignment'
    },
    {
      label: 'OICR Details',
      path: 'oicr-details',
      indicator_id: 5,
      greenCheckKey: 'oicr'
    },
    {
      label: 'Innovation details',
      path: 'innovation-details',
      indicator_id: 2,
      greenCheckKey: 'innovation_dev'
    },
    {
      label: 'CapSharing details',
      path: 'capacity-sharing',
      indicator_id: 1,
      greenCheckKey: 'cap_sharing'
    },
    {
      label: 'Policy Change details',
      path: 'policy-change',
      indicator_id: 4,
      greenCheckKey: 'policy_change'
    },
    {
      label: 'Results partners',
      path: 'partners',
      greenCheckKey: 'partners'
    },
    {
      label: 'Geographic scope',
      path: 'geographic-scope',
      underConstruction: false,
      hide: false,
      greenCheckKey: 'geo_location'
    },
    {
      label: 'Links to result',
      path: 'links-to-result',
      indicator_id: 5,
      greenCheckKey: 'link_result'
    },
    {
      label: 'Evidence',
      path: 'evidence',
      greenCheckKey: 'evidences'
    },
    {
      label: 'IP rights',
      path: 'ip-rights',
      indicator_id: 1,
      greenCheckKey: 'ip_rights'
    },
    {
      label: 'IP rights',
      path: 'ip-rights',
      indicator_id: 2,
      greenCheckKey: 'ip_rights'
    },
    {
      label: 'Pool funding alignment',
      path: 'pool-funding-alignment',
      greenCheckKey: 'pool_funding_alignment',
      optional: true
    }
  ]);

  submissionAlertData = computed(
    (): SubmissionAlertData => ({
      severity: 'success',
      placeholder: 'Add any additional comments here',
      summary: 'CONFIRM SUBMISSION',
      detail: `The result <span class="font-medium">"${this.cache.currentMetadata().result_title}"</span> is about to be <span class="font-medium">submitted</span>. Once confirmed, no further changes can be made. If you have any comments, feel free to add them below.`
    })
  );

  unsavedChangesAlertData = computed(
    (): SubmissionAlertData => ({
      severity: 'warning',
      placeholder: 'Please share your feedback about the unsubmission',
      summary: 'CONFIRM UNSUBMISSION',
      detail: `You are about to <span class="font-medium">unsubmit</span> the result <span class="font-medium">"${this.cache.currentMetadata().result_title}"</span>. To continue, please provide a brief reason for the unsubmission.`
    })
  );

  getCompletedCount(): number {
    return this.allOptionsWithGreenChecks()
      .filter(option => !option.hide && this.countsTowardSectionCompletion(option) && option.greenCheck)
      .length;
  }

  getTotalCount(): number {
    return this.allOptionsWithGreenChecks()
      .filter(option => !option.hide && this.countsTowardSectionCompletion(option))
      .length;
  }

  submmitConfirm() {
    const { severity, placeholder, summary, detail } = this.submissionService.currentResultIsSubmitted()
      ? this.unsavedChangesAlertData()
      : this.submissionAlertData();

    this.actions.showGlobalAlert({
      severity,
      summary,
      detail,
      placeholder,
      commentLabel: this.submissionService.currentResultIsSubmitted() ? 'Feedback about the unsubmission' : 'Comment',
      commentRequired: this.submissionService.currentResultIsSubmitted(),
      confirmCallback: {
        label: 'Confirm',
        event: (data?: { comment?: string; selected?: string }) => {
          (async () => {
            const response = await this.api.PATCH_SubmitResult({
              resultCode: this.cache.getCurrentNumericResultId(),
              comment: data?.comment ?? '',
              status: this.submissionService.currentResultIsSubmitted() ? 4 : 2
            });
            this.metadata.update(this.cache.getCurrentNumericResultId());
            this.submissionService.refreshSubmissionHistory.update(v => v + 1);
            if (!response.successfulRequest) {
              this.actions.showToast({ severity: 'error', summary: 'Error', detail: response.errorDetail.errors });
            } else if (!this.submissionService.currentResultIsSubmitted()) {
              this.actions.showGlobalAlert({
                severity: 'success',
                hasNoButton: true,
                summary: 'RESULT SUBMITTED',
                detail: 'The result was submitted successfully.'
              });
            }
          })();
        }
      }
    });
  }

  async approveResult() {
    const response = await this.api.PATCH_SubmitResult({
      resultCode: this.cache.getCurrentNumericResultId(),
      status: 6
    });
    if (response.successfulRequest) {
      await this.metadata.update(this.cache.getCurrentNumericResultId());
      this.submissionService.refreshSubmissionHistory.update(v => v + 1);
      this.actions.showToast({
        severity: 'success',
        summary: 'Result approved',
        detail: 'The result has been approved successfully.'
      });
    } else {
      this.actions.showToast({
        severity: 'error',
        summary: 'Error',
        detail: response.errorDetail?.errors || 'Unable to approve result, please try again.'
      });
    }
  }

  navigateTo(option: SidebarOption, event: Event) {
    if (option.disabled) {
      event.preventDefault();
      return;
    }

    const id = this.route.snapshot.paramMap.get('id');
    const m = this.route.snapshot.queryParamMap;
    const version = m.get('version');
    const from = m.get('from');
    const commands = ['/result', id, option.path];

    const queryParams: Record<string, string> = {};
    if (version) {
      queryParams['version'] = version;
    }
    if (from === RESULT_ENTRY_SOURCE_VALUE_RESULTS_CENTER || from === RESULT_ENTRY_SOURCE_VALUE_HOME) {
      queryParams[RESULT_ENTRY_SOURCE_QUERY] = from;
    }

    this.router.navigate(commands, {
      queryParams,
      replaceUrl: false
    });
  }

  getRouterLink(option: SidebarOption): string[] | null {
    if (option.disabled) return null;

    const id = this.route.snapshot.paramMap.get('id');
    return ['/result', id!, option.path];
  }

  async onStatusChange(newStatusId: number): Promise<void> {
    const specialAlert = this.getSpecialStatusAlert(newStatusId);
    if (specialAlert) {
      this.actions.showGlobalAlert({
        severity: specialAlert.severity,
        summary: specialAlert.summary,
        detail: specialAlert.detail,
        placeholder: specialAlert.placeholder,
        icon: specialAlert.icon,
        iconClass: specialAlert.iconClass,
        color: specialAlert.color,
        commentLabel: 'Justification',
        commentAsTextArea: true,
        commentRequired: true,
        confirmCallback: {
          label: 'Confirm',
          event: (data?: { comment?: string }) => {
            void this.updateResultStatus(newStatusId, data?.comment ?? '');
          }
        },
        cancelCallback: {
          label: 'Cancel'
        }
      });
      return;
    }

    await this.updateResultStatus(newStatusId, '');
  }

  private getSpecialStatusAlert(statusId: number): GlobalAlert | null {
    const resultTitle = this.cache.currentMetadata().result_title ?? '';

    if (statusId === 11) {
      return {
        severity: 'warning',
        summary: 'POSTPONE THIS OICR?',
        detail: `You are about to <span class="font-medium">postpone</span> the result "<span class="font-medium">${resultTitle}</span>". To continue, please provide a brief reason.`,
        placeholder: 'TProvide the justification to reject this OICR.',
        icon: 'pi pi-minus-circle',
        iconClass: 'text-[#E69F00]',
        color: '#E69F00',
        commentAsTextArea: true
      };
    }

    if (statusId === 15) {
      return {
        severity: 'error',
        summary: 'DO NOT ACCEPT this OICR?',
        detail: `You are about to <span class="font-medium">not accept</span> the result "<span class="font-medium">${resultTitle}</span>". To continue, please provide a brief reason.`,
        placeholder: 'Provide the justification to reject this OICR',
        icon: 'pi pi-times-circle',
        iconClass: 'text-[#CF0808]',
        color: '#CF0808',
        commentAsTextArea: true
      };
    }

    return null;
  }

  private async updateResultStatus(status: number, comment: string): Promise<void> {
    try {
      const response = await this.api.PATCH_SubmitResult({
        resultCode: this.cache.getCurrentNumericResultId(),
        comment,
        status
      });

      if (response.successfulRequest) {
        await this.handleSuccessfulStatusUpdate(status);
      } else {
        this.actions.showToast({
          severity: 'error',
          summary: 'Error',
          detail: response.errorDetail?.errors || 'Unable to update status, please try again'
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      this.actions.showToast({
        severity: 'error',
        summary: 'Error',
        detail: 'Unable to update status, please try again'
      });
    }
  }

  private async handleSuccessfulStatusUpdate(status: number): Promise<void> {
    await this.metadata.update(this.cache.getCurrentNumericResultId());

    const { indicator_id, status_id, result_contract_id, result_title, result_official_code } = this.cache.currentMetadata() || {};

    if (this.currentResultService.validateOpenResult(indicator_id ?? 0, status_id ?? 0)) {
      const isDraft = (status_id ?? 0) === 10 || (status_id ?? 0) === 12 || (status_id ?? 0) === 13;
      if (!isDraft || (isDraft && !this.roles.isAdmin())) {
        if (result_contract_id) {
          await this.openOicrEditModalAfterProjectOrResultsCenterNavigation(
            String(result_contract_id),
            result_title,
            indicator_id ?? 0,
            status_id ?? 0,
            result_official_code ?? 0
          );
          return;
        }
      }
    }

    this.actions.showToast({
      severity: 'success',
      summary: 'Status updated',
      detail: 'The status has been updated successfully'
    });

    if (status === 11 || status === 15 || status === 7) {
      await this.handlePostponeOrRejectRedirect();
    }
  }

  private async handlePostponeOrRejectRedirect(): Promise<void> {
    const { indicator_id, status_id, result_contract_id, result_title, result_official_code } = this.cache.currentMetadata() || {};

    if (!this.currentResultService.validateOpenResult(indicator_id ?? 0, status_id ?? 0)) {
      return;
    }

    const isDraft = (status_id ?? 0) === 4 || (status_id ?? 0) === 14 || (status_id ?? 0) === 12 || (status_id ?? 0) === 13;

    if (isDraft || !result_contract_id) {
      return;
    }

    await this.openOicrEditModalAfterProjectOrResultsCenterNavigation(
      String(result_contract_id),
      result_title,
      indicator_id ?? 0,
      status_id ?? 0,
      result_official_code ?? 0
    );
  }

  private async openOicrEditModalAfterProjectOrResultsCenterNavigation(
    resultContractId: string,
    resultTitle: string | undefined | null,
    indicatorId: number,
    statusId: number,
    resultOfficialCode: number
  ): Promise<void> {
    const fromResultsCenter = isResultsCenterEntryFromUrl(this.router.url);
    const fromHome = isHomeEntryFromUrl(this.router.url);
    if (fromResultsCenter) {
      await this.router.navigate(['/results-center']);
    } else if (fromHome) {
      await this.router.navigate(['/home']);
    } else {
      await this.router.navigate(['/project-detail', resultContractId]);
      if (!this.router.url.includes('/project-detail/')) {
        this.cache.projectResultsSearchValue.set(resultTitle ?? '');
      }
    }
    let creationContext: 'results-center' | 'project' | undefined;
    if (fromResultsCenter) {
      creationContext = 'results-center';
    } else if (!fromHome) {
      creationContext = 'project';
    }
    await this.currentResultService.openEditRequestdOicrsModal(indicatorId, statusId, resultOfficialCode, creationContext);
  }
}
