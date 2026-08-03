import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { BilateralService } from '@services/bilateral.service';
import { ActionsService } from '@services/actions.service';
import { ClarityService } from '@services/clarity.service';
import { CustomTagComponent } from '@shared/components/custom-tag/custom-tag.component';

const NOT_BILATERAL_INLINE_MSG = 'This contract is not bilateral. Only bilateral contracts can carry the Pool Funding tag.';
const JUSTIFICATION_MAX_LENGTH = 500;

@Component({
  selector: 'app-agresso-pool-funding-tag',
  standalone: true,
  imports: [FormsModule, ButtonModule, CheckboxModule, InputTextModule, TextareaModule, CustomTagComponent],
  templateUrl: './agresso-pool-funding-tag.component.html',
  styleUrl: './agresso-pool-funding-tag.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class AgressoPoolFundingTagComponent implements OnInit {
  private readonly bilateralService = inject(BilateralService);
  private readonly actions = inject(ActionsService);
  private readonly clarity = inject(ClarityService);
  private readonly route = inject(ActivatedRoute);

  readonly justificationMaxLength = JUSTIFICATION_MAX_LENGTH;

  readonly contractCode = signal('');
  readonly newValue = signal<boolean | null>(null);
  readonly justification = signal('');
  readonly inlineError = signal<string | null>(null);
  readonly saveSuccess = signal(false);

  readonly loading = this.bilateralService.loadingContract;
  readonly saving = this.bilateralService.savingTag;
  readonly contract = this.bilateralService.currentContract;

  readonly isBilateral = computed(() => this.bilateralService.isBilateral(this.contract()));
  readonly canSave = computed(() => {
    const c = this.contract();
    const next = this.newValue();
    if (!c) return false;
    if (next === null) return false;
    if (!this.isBilateral()) return false;
    return next !== !!c.is_pool_funding_contributor;
  });

  ngOnInit(): void {
    const pre = this.route.snapshot.queryParamMap.get('contract-code');
    if (pre) {
      this.contractCode.set(pre);
      void this.onLookup();
    }
  }

  async onLookup(): Promise<void> {
    this.inlineError.set(null);
    this.saveSuccess.set(false);
    const code = this.contractCode().trim();
    if (!code) {
      this.inlineError.set('Enter a contract code to look up.');
      return;
    }
    const result = await this.bilateralService.getContract(code);
    if (!result) {
      this.inlineError.set(`No contract found for code "${code}".`);
      this.newValue.set(null);
      return;
    }
    this.newValue.set(!!result.is_pool_funding_contributor);
  }

  async onSave(): Promise<void> {
    const c = this.contract();
    const next = this.newValue();
    if (!c || next === null || !c.agreement_id) return;

    const priorValue = !!c.is_pool_funding_contributor;
    const contractCode = c.agreement_id;

    this.inlineError.set(null);
    this.saveSuccess.set(false);

    const result = await this.bilateralService.patchTag(contractCode, next);

    if (result.ok) {
      this.clarity.trackEvent('bilateral.tag.override.saved', {
        contract_code: contractCode,
        new_value: next,
        prior_value: priorValue
      });
      this.saveSuccess.set(true);
      this.actions.showToast({ severity: 'success', summary: 'AGRESSO', detail: 'Pool Funding tag updated' });
      return;
    }

    if (result.status === 400 && result.description.toLowerCase().includes('bilateral')) {
      this.inlineError.set(NOT_BILATERAL_INLINE_MSG);
      return;
    }
    if (result.status === 400 && result.description) {
      this.inlineError.set(result.description);
    }
  }

  onJustificationInput(value: string): void {
    const clipped = value.length > JUSTIFICATION_MAX_LENGTH ? value.slice(0, JUSTIFICATION_MAX_LENGTH) : value;
    this.justification.set(clipped);
  }
}
