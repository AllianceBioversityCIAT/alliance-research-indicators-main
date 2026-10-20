import { Component, computed, inject, signal } from '@angular/core';
import { TextareaComponent } from '../../../../../../shared/components/custom-fields/textarea/textarea.component';
import { SelectComponent } from '../../../../../../shared/components/custom-fields/select/select.component';
import { MultiselectComponent } from '../../../../../../shared/components/custom-fields/multiselect/multiselect.component';
import { ApiService } from '../../../../../../shared/services/api.service';
import { CacheService } from '../../../../../../shared/services/cache/cache.service';
import { ActionsService } from '../../../../../../shared/services/actions.service';
import { GetPolicyChange } from '../../../../../../shared/interfaces/get-get-policy-change.interface';
import { RadioButtonComponent } from '../../../../../../shared/components/custom-fields/radio-button/radio-button.component';
import { InputComponent } from '../../../../../../shared/components/custom-fields/input/input.component';
import { ActivatedRoute, Router } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { PartnerSelectedItemComponent } from '../../../../../../shared/components/partner-selected-item/partner-selected-item.component';
import { FormsModule } from '@angular/forms';
import { SubmissionService } from '@shared/services/submission.service';
import { FormHeaderComponent } from '@shared/components/form-header/form-header.component';
import { VersionWatcherService } from '@shared/services/version-watcher.service';
import { NavigationButtonsComponent } from '@shared/components/navigation-buttons/navigation-buttons.component';
import { GetPolicyChangeLinkableResultsService } from '@shared/services/control-list/get-policy-change-linkable-results.service';
import { formatInnovationDevCode, formatInnovationDevLabel } from '../innovation-use-details/innovation-use-details.component';
import { CustomTagComponent } from '@shared/components/custom-tag/custom-tag.component';

/** STAR policy_types id for "Program, Budget, or Investment". */
const PROGRAM_BUDGET_OR_INVESTMENT_TYPE_ID = 3;

@Component({
  selector: 'app-policy-change',
  templateUrl: './policy-change.component.html',
  standalone: true,
  imports: [
    RadioButtonComponent,
    TextareaComponent,
    MultiselectComponent,
    SelectComponent,
    InputComponent,
    NavigationButtonsComponent,
    FormHeaderComponent,
    FormsModule,
    TooltipModule,
    PartnerSelectedItemComponent,
    CustomTagComponent
  ]
})
export default class PolicyChangeComponent {
  api = inject(ApiService);
  submission = inject(SubmissionService);
  cache = inject(CacheService);
  actions = inject(ActionsService);
  route = inject(ActivatedRoute);
  linkableResults = inject(GetPolicyChangeLinkableResultsService);
  readonly formatInnovationDevLabel = formatInnovationDevLabel;
  readonly formatInnovationDevCode = formatInnovationDevCode;

  /** §5.1 — disabled from this indicator's own loading, error, list, and editability. */
  innovationDevelopmentDisabled = computed(() => this.isLinkPickerDisabled(2));
  innovationUseDisabled = computed(() => this.isLinkPickerDisabled(6));
  innovationDevelopmentTooltip = computed(() =>
    this.linkPickerTooltip(2, 'There are no reported Innovation Development outputs to link.')
  );
  innovationUseTooltip = computed(() => this.linkPickerTooltip(6, 'There are no reported Innovation Use results to link.'));

  router = inject(Router);
  body = signal<GetPolicyChange>({});
  loading = signal(false);
  versionWatcher = inject(VersionWatcherService);

  policyStages = signal<{ list: { id: number; name: string }[]; loading: boolean }>({
    list: [
      { id: 1, name: 'Stage 1: Research taken up by next user, policy change not yet enacted' },
      { id: 2, name: 'Stage 2: Policy enacted' },
      { id: 3, name: 'Stage 3: Evidence of impact of policy' }
    ],
    loading: false
  });

  constructor() {
    this.versionWatcher.onVersionChange(() => {
      this.getData();
    });
  }

  canRemove = (): boolean => {
    return this.submission.isEditableStatus();
  };

  private isLinkPickerDisabled(indicatorId: number): boolean {
    if (this.linkableResults.getLoading(indicatorId)()) return true;
    if (this.linkableResults.getError(indicatorId)()) return true;
    if (this.linkableResults.getList(indicatorId)().length === 0) return true;
    return !this.submission.isEditableStatus();
  }

  private linkPickerTooltip(indicatorId: number, emptyText: string): string {
    const stillLoading = this.linkableResults.getLoading(indicatorId)();
    const failed = this.linkableResults.getError(indicatorId)();
    const empty = this.linkableResults.getList(indicatorId)().length === 0;
    if (!stillLoading && !failed && empty) return emptyText;
    return '';
  }

  isProgramBudgetOrInvestment(): boolean {
    return this.body().policy_type_id === PROGRAM_BUDGET_OR_INVESTMENT_TYPE_ID;
  }

  onPolicyTypeChange(typeId: number): void {
    if (typeId !== PROGRAM_BUDGET_OR_INVESTMENT_TYPE_ID) {
      this.body.update(current => ({
        ...current,
        usd_amount: null,
        amount_status: null
      }));
      return;
    }
    this.initializeAmount();
  }

  async getData() {
    this.loading.set(true);
    const response = await this.api.GET_PolicyChange(this.cache.getCurrentNumericResultId());
    response.data.loaded = true;
    this.body.set(response.data);
    this.initializeAmount();
    this.loading.set(false);
  }

  /** Zero is a saved value. Only a missing amount starts at 0. */
  private initializeAmount(): void {
    if (!this.isProgramBudgetOrInvestment()) return;
    if (this.body().usd_amount === null || this.body().usd_amount === undefined) {
      this.body.update(current => ({ ...current, usd_amount: 0 }));
    }
  }

  async saveData(page?: 'next' | 'back') {
    this.loading.set(true);
    const version = this.route.snapshot.queryParamMap.get('version');
    const queryParams = version ? { version } : undefined;

    const navigateTo = (path: string) => {
      this.router.navigate(['result', this.cache.currentResultId(), path], {
        queryParams,
        replaceUrl: true
      });
    };

    if (this.submission.isEditableStatus()) {
      const response = await this.api.PATCH_PolicyChange(this.cache.getCurrentNumericResultId(), this.body());
      if (response.successfulRequest) {
        this.actions.showToast({ severity: 'success', summary: 'Policy Change', detail: 'Data saved successfully' });
        await this.getData();
      }
    }
    if (page === 'next') navigateTo('partners');
    if (page === 'back') navigateTo('alliance-alignment');
    this.loading.set(false);
  }
}
