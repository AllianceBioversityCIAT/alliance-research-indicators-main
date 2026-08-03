import { ChangeDetectionStrategy, Component, effect, inject, LOCALE_ID, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { AllModalsService } from '@services/cache/all-modals.service';
import { ApiService } from '@services/api.service';
import { IndicatorsService } from '../../../../../../services/control-list/indicators.service';
import { GetContractsService } from '../../../../../../services/control-list/get-contracts.service';
import { GetResultsService } from '../../../../../../services/control-list/get-results.service';
import { CacheService } from '../../../../../../services/cache/cache.service';
import { ActionsService } from '../../../../../../services/actions.service';
import { MainResponse } from '../../../../../../interfaces/responses.interface';
import { Result } from '../../../../../../interfaces/result/result.interface';
import { CreateResultManagementService } from '../../services/create-result-management.service';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { GetContracts } from '../../../../../../interfaces/get-contracts.interface';
import { IndicatorGroup } from '@shared/interfaces/api.interface';
import { SelectModule } from 'primeng/select';
import localeEs from '@angular/common/locales/es';
import { NgTemplateOutlet, registerLocaleData } from '@angular/common';
import { GetYearsService } from '@shared/services/control-list/get-years.service';
import { SharedResultFormComponent } from '@shared/components/shared-result-form/shared-result-form.component';
import { WordCountService } from '@shared/services/word-count.service';
import { getContractStatusClasses } from '@shared/constants/status-classes.constants';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';
import { environment } from '../../../../../../../../environments/environment';
import { BaseInformation, StepTwo, Lever } from '../../../../../../interfaces/oicr-creation.interface';
import { PLATFORM_CODES } from '@shared/constants/platform-codes';
import { ResultFilter, ResultConfig } from '@shared/interfaces/result/result.interface';

registerLocaleData(localeEs);

@Component({
  selector: 'app-create-result-form',
  imports: [
    DialogModule,
    ButtonModule,
    FormsModule,
    InputTextModule,
    S3ImageUrlPipe,
    NgTemplateOutlet,
    SelectModule,
    RouterModule,
    SharedResultFormComponent,
    AutoCompleteModule
  ],
  templateUrl: './create-result-form.component.html',
  providers: [{ provide: LOCALE_ID, useValue: 'es' }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateResultFormComponent {
  allModalsService = inject(AllModalsService);
  indicatorsService = inject(IndicatorsService);
  yearsService = inject(GetYearsService);
  getContractsService = inject(GetContractsService);
  getResultsService = inject(GetResultsService);
  createResultManagementService = inject(CreateResultManagementService);
  cache = inject(CacheService);
  router = inject(Router);
  api = inject(ApiService);
  actions = inject(ActionsService);
  wordCountService = inject(WordCountService);

  // External links by environment
  prmsUrl: string = environment.prmsUrl;
  tipUrl: string = environment.tipUrl;

  body = signal<{ indicator_id: number | null; title: string | null; contract_id: string | null; year: number | null }>({
    indicator_id: null,
    title: null,
    year: null,
    contract_id: null
  });
  filteredPrimaryContracts = signal<GetContracts[]>([]);
  sharedFormValid = false;
  loading = false;
  contractId: string | null = null;

  public getContractStatusClasses = getContractStatusClasses;

  syncPresetContractId = effect(
    () => {
      const shouldPreset = this.createResultManagementService.presetFromProjectResultsTable();
      const presetId = this.createResultManagementService.contractId();
      if (shouldPreset && presetId !== null) {
        this.contractId = presetId;
        this.body.update(b => ({ ...b, contract_id: presetId }));
      } else {
        this.contractId = null;
        this.body.update(b => ({ ...b, contract_id: null }));
      }
    },
    { allowSignalWrites: true }
  );

  private buildW1W2RestrictionHtml(): string {
    const agreementId = this.body()?.contract_id;

    const contracts = this.getContractsService.list();
    const contract: GetContracts | undefined = contracts.find(c => c.agreement_id === agreementId);
    const projectLabel = contract?.select_label ?? agreementId ?? '';
    const [projectFirst, ...projectRest] = String(projectLabel).split(' - ');
    const projectSecond = projectRest.join(' - ');

    const indicatorId = this.body()?.indicator_id;

    const indicatorsFn = (this.indicatorsService as unknown as { indicators?: () => IndicatorGroup[] }).indicators;
    const groups = indicatorsFn ? indicatorsFn() : [];
    const allIndicators = groups.flatMap(g => g.indicators ?? []);
    const indicatorName = allIndicators.find(i => i.indicator_id === indicatorId)?.name ?? 'selected';

    return (
      `You selected “<em><strong>${projectFirst || ''}</strong>${projectSecond ? ' - ' + projectSecond : ''}</em>” with the “<em>${indicatorName}</em>” indicator. ` +
      `Results from Science Programs and Accelerators (W1/W2 pooled funding) using this indicator cannot be reported in STAR. ` +
      `Please report directly in PRMS.<br/><br/>` +
      `If you have any questions, please contact the SPRM team at: ` +
      `<a class="text-[#1689CA] hover:underline" href="mailto:Alliance-SPRM@cgiar.org">Alliance-SPRM@cgiar.org</a>`
    );
  }

  onYearsLoaded = effect(
    () => {
      const years = this.yearsService.list();
      const currentYear = new Date().getFullYear();

      if (years.length > 0 && years.some(y => y.report_year === currentYear)) {
        this.body.update(body => ({
          ...body,
          year: currentYear
        }));
      }
    },
    { allowSignalWrites: true }
  );

  get currentYear(): number {
    return new Date().getFullYear();
  }

  get isYearMissing(): boolean {
    return !this.body()?.year;
  }

  get isTitleMissing(): boolean {
    return !this.body()?.title;
  }

  get isIndicatorIdMissing(): boolean {
    return !this.body()?.indicator_id;
  }

  get isDisabled(): boolean {
    const b = this.body();
    return !this.sharedFormValid || !b.title?.length || !b.indicator_id || !b.contract_id || !b.year || this.isW1W2NonOicr();
  }

  private isW1W2NonOicr(): boolean {
    const indicatorId = this.body()?.indicator_id;
    const agreementId = this.body()?.contract_id;
    if (!indicatorId || !agreementId) return false;

    const contracts = this.getContractsService.list();
    const contract = contracts.find(c => c.agreement_id === agreementId);
    const is_science_program = contract?.is_science_program;
    const isOicr = indicatorId === 5;
    return Boolean((is_science_program) && !isOicr);
  }

  onContractIdChange(newAgreementId: string | null) {
    this.contractId = newAgreementId;
    this.body.update(b => ({ ...b, contract_id: newAgreementId }));
    this.maybeShowW1W2Alert();
  }

  onIndicatorChange(newIndicatorId: number | null) {
    this.body.update(b => {
      const updatedBody = { ...b, indicator_id: newIndicatorId };
      // If indicator is OICR (5), preselect year 2025
      if (newIndicatorId === 5) {
        updatedBody.year = 2025;
      }
      return updatedBody;
    });
    this.maybeShowW1W2Alert();
  }

  private maybeShowW1W2Alert() {
    const shouldBlock = this.isW1W2NonOicr();
    if (shouldBlock) {
      this.actions.showGlobalAlert({
        severity: 'info',
        summary: 'Pooled-Funded Projects Must Be Reported in PRMS',
        detail: this.buildW1W2RestrictionHtml(),
        hasNoCancelButton: true,
        generalButton: true,
        confirmCallback: {
          label: 'Report in PRMS',
          event: () => window.open(this.prmsUrl, '_blank')
        },
        buttonColor: '#035BA9',
        buttonIconClass: 'pi pi-external-link text-white !text-[16px] pb-1.5'
      });
    }
  }

  getPrimaryLeverId(contractId: string) {
    const contract = this.getContractsService.list().find(c => c.agreement_id === String(contractId));
    return contract?.lever_id;
  }

  /** Build primary_lever array for OICR; used by navigateToOicr and tests for branch coverage */
  getPrimaryLeverForOicr(): Lever[] {
    const leverId = this.getPrimaryLeverId(this.body().contract_id || '');
    if (!leverId) return [];
    return [
      {
        result_lever_id: 0,
        result_id: 0,
        lever_id: Number(leverId),
        lever_role_id: 0,
        is_primary: true
      } as Lever
    ];
  }

  async CreateOicr() {
    const title = this.body().title?.trim() ?? '';
    const res = await this.api.GET_ValidateTitle(title);
    const isValid = Boolean(res.successfulRequest && res.data?.isValid);
    if (isValid) {
      this.navigateToOicr();
      return;
    }

    const code = res.data?.result_official_code;
    const platform = res.data?.platform_code ?? 'STAR';
    const resultCode = code != null ? `${platform}-${code}` : null;
    const isNonStar = platform !== PLATFORM_CODES.STAR;
    const openModalOnLinkClick = isNonStar && code != null;
    const canNavigateDirectly = resultCode && !openModalOnLinkClick;
    const linkHref = canNavigateDirectly ? `result/${resultCode}/general-information` : '#';
    const detail = resultCode
      ? `Please enter a different title. Existing result: <a href="${linkHref}" target="_blank" class="alert-link-custom"><span class="alert-link-bold">${resultCode}</span></a>`
      : 'Please enter a different title.';

    this.actions.showGlobalAlert({
      severity: 'secondary',
      summary: 'Title Already Exists',
      detail,
      hasNoCancelButton: true,
      generalButton: true,
      confirmCallback: { label: 'Enter other title', event: () => null },
      ...(openModalOnLinkClick && {
        onDetailLinkClick: () => { void this.openExistingResultModal(platform, String(code)); }
      }),
      buttonColor: '#035BA9'
    });
  }

  navigateToOicr() {
    this.createResultManagementService.setContractId(this.body().contract_id);
    this.createResultManagementService.setResultTitle(this.body().title);
    this.createResultManagementService.setYear(this.body().year);
    this.createResultManagementService.setModalTitle('Outcome Impact Case Report (OICR)');
    this.createResultManagementService.createOicrBody.update(b => ({
      ...b,
      base_information: {
        ...b.base_information,
        title: this.body().title || '',
        contract_id: this.body().contract_id || '',
        year: this.body().year || ''
      } as BaseInformation,
      step_two: {
        ...b.step_two,
        primary_lever: this.getPrimaryLeverForOicr()
      } as StepTwo
    }));
    const primaryLeverEntry = this.getPrimaryLeverForOicr()[0] ?? {
      result_lever_id: 0,
      result_id: 0,
      lever_id: Number(this.getPrimaryLeverId(this.body().contract_id || '')),
      lever_role_id: 0,
      is_primary: true
    } as Lever;
    this.createResultManagementService.oicrPrimaryOptionsDisabled.update(b => [...b, primaryLeverEntry]);
    this.createResultManagementService.resultPageStep.set(2);
  }

  async createResult(openresult?: boolean) {
    this.loading = true;
    try {
      const result = await this.api.POST_Result(this.body());
      if (result.successfulRequest) {
        this.successRequest(result, openresult);
      } else {
        this.actions.handleBadRequest(result, undefined, {
          onOpenExistingResult: (platformCode, resultOfficialCode) => {
            void this.openExistingResultModal(platformCode, resultOfficialCode);
          }
        });
      }
    } finally {
      this.loading = false;
    }
  }

  async openExistingResultModal(platformCode: string, resultOfficialCode: string): Promise<void> {
    try {
      const filter: ResultFilter = {
        'platform-code': [platformCode],
        'result-codes': [resultOfficialCode]
      };
      const resultConfig: ResultConfig = {
        indicators: true,
        'result-status': true,
        contracts: true,
        'primary-contract': true,
        levers: true,
        'primary-lever': true,
        'audit-data': true,
        'audit-data-object': true
      };
      const response = await this.api.GET_Results(filter, resultConfig, { page: 1, limit: 1000, sortField: 'code' });
      const list: Result[] = response?.data?.results ?? [];
      const result = list.find(
        (r: Result) => String(r.result_official_code) === resultOfficialCode && r.platform_code === platformCode
      ) ?? (list.length === 1 ? list[0] : null);
      if (result) {
        const normalized: Result = {
          ...result,
          result_official_code: String(result.result_official_code),
          result_contracts: result.result_contracts ?? undefined,
          result_levers: result.result_levers ?? undefined,
          indicators: result.indicators ?? undefined,
          result_status: result.result_status ?? undefined,
          created_by_user: result.created_by_user ?? undefined,
          snapshot_years: Array.isArray(result.snapshot_years) ? result.snapshot_years : []
        };
        this.allModalsService.selectedResultForInfo.set(normalized);
        this.allModalsService.openModal('resultInformation');
      }
    } catch {
      // ignore fetch errors
    }
  }

  successRequest = (result: MainResponse<Result>, openresult?: boolean) => {
    const currentYear = new Date().getFullYear();
    this.actions.showToast({
      severity: 'success',
      summary: 'Success',
      detail: `Result "${this.truncateTitle(this.body().title || '')}" created successfully`
    });

    this.body.set({ indicator_id: null, title: null, contract_id: null, year: currentYear });
    this.contractId = null;
    this.sharedFormValid = false;

    if (openresult) {
      this.cache.currentResultId.set(Number(result.data.result_official_code));
      const platformCode = result.data.platform_code ?? 'STAR';

      if (platformCode !== PLATFORM_CODES.STAR) {
        this.allModalsService.selectedResultForInfo.set(result.data);
        this.allModalsService.openModal('resultInformation');
      } else {
        const resultCode = `${platformCode}-${result.data.result_official_code}`;
        this.router.navigate(['result', resultCode], { replaceUrl: true });
      }

      this.allModalsService.closeModal('createResult');
    }

    this.getResultsService.updateList();
  };

  getWordCount(): number {
    const title = this.body()?.title?.trim() || '';
    return title ? title.split(' ').filter(word => word.length > 0).length : 0;
  }

  getWordCounterColor(): string {
    const count = this.getWordCount();
    if (count === 0) return '#8d9299';
    if (count > 30) return '#CF0808';
    return '#358540';
  }

  truncateTitle(title: string, maxWords = 30): string {
    if (!title) return '';

    const words = title
      .trim()
      .split(' ')
      .filter(word => word.length > 0);

    if (words.length <= maxWords) {
      return title;
    }

    return words.slice(0, maxWords).join(' ') + '...';
  }
}
