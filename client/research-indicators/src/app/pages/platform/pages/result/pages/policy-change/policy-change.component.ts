import { Component, inject, signal } from '@angular/core';
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
    PartnerSelectedItemComponent
  ]
})
export default class PolicyChangeComponent {
  api = inject(ApiService);
  submission = inject(SubmissionService);
  cache = inject(CacheService);
  actions = inject(ActionsService);
  route = inject(ActivatedRoute);

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
    }
  }

  async getData() {
    this.loading.set(true);
    const response = await this.api.GET_PolicyChange(this.cache.getCurrentNumericResultId());
    response.data.loaded = true;
    this.body.set(response.data);
    this.loading.set(false);
  }

  private amountFieldsValid(): boolean {
    if (!this.isProgramBudgetOrInvestment()) return true;
    const amount = this.body().usd_amount;
    const status = this.body().amount_status;
    const amountOk = amount !== null && amount !== undefined && Number(amount) >= 0 && Number.isFinite(Number(amount));
    const statusOk = status === 'Confirmed' || status === 'Estimated' || status === 'Unknown';
    return amountOk && statusOk;
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
      if (!this.amountFieldsValid()) {
        this.actions.showToast({
          severity: 'warn',
          summary: 'Policy Change',
          detail: 'USD Amount and Status are required when Policy Type is Program, Budget, or Investment'
        });
        this.loading.set(false);
        return;
      }

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
