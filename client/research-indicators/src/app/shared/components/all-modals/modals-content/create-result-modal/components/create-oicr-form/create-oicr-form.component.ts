import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  LOCALE_ID,
  signal,
  computed,
  QueryList,
  ViewChildren,
  WritableSignal,
  OnInit
} from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';

import { StepsModule } from 'primeng/steps';
import { CREATE_OICR_STEPPER_ITEMS, CREATE_OICR_STEPPER_SECTIONS } from '@shared/constants/stepper.constants';
import { AllModalsService } from '@services/cache/all-modals.service';
import { ApiService } from '@services/api.service';
import { GetResultsService } from '@shared/services/control-list/get-results.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { ActionsService } from '@shared/services/actions.service';
import { CreateResultManagementService } from '@shared/components/all-modals/modals-content/create-result-modal/services/create-result-management.service';
import { GetContracts, GetContractsExtended } from '@shared/interfaces/get-contracts.interface';
import { SubmissionHistoryItem } from '@shared/interfaces/submission-history.interface';

import { GetYearsService } from '@shared/services/control-list/get-years.service';
import { WordCountService } from '@shared/services/word-count.service';
import { getContractStatusClasses } from '@shared/constants/status-classes.constants';
import { TextareaComponent } from '@shared/components/custom-fields/textarea/textarea.component';
import { MultiselectComponent } from '@shared/components/custom-fields/multiselect/multiselect.component';
import { RadioButtonComponent } from '@shared/components/custom-fields/radio-button/radio-button.component';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { MultiselectInstanceComponent } from '@shared/components/custom-fields/multiselect-instance/multiselect-instance.component';
import {
  getGeoScopeMultiselectTexts,
  isCountriesRequiredByScope,
  isRegionsRequiredByScope,
  isSubNationalRequiredByScope,
  mapCountriesToSubnationalSignals,
  removeSubnationalRegionFromCountries,
  shouldShowSubnationalError,
  syncSubnationalArrayFromSignals,
  updateCountryRegions
} from '@shared/utils/geographic-scope.util';
import { Country, Region } from '@shared/interfaces/get-geo-location.interface';
import { environment } from '@envs/environment';
import { Lever } from '@shared/interfaces/oicr-creation.interface';
import { GetLeversParams } from '@shared/interfaces/get-levers.interface';
import { TooltipModule } from 'primeng/tooltip';
import { ServiceLocatorService } from '@shared/services/service-locator.service';
import { Router } from '@angular/router';
import { OicrFormFieldsComponent } from '@shared/components/custom-fields/oicr-form-fields/oicr-form-fields.component';
import { RolesService } from '@shared/services/cache/roles.service';
import { ProjectResultsTableService } from '@shared/components/project-results-table/project-results-table.service';
import { OicrHeaderComponent } from '@shared/components/oicr-header/oicr-header.component';
import { CurrentResultService } from '@shared/services/cache/current-result.service';
import {
  isResultsCenterEntryFromUrl,
  OICR_FULL_EDIT_QUERY,
  OICR_FULL_EDIT_VALUE,
  RESULT_ENTRY_SOURCE_QUERY,
  RESULT_ENTRY_SOURCE_VALUE_RESULTS_CENTER
} from '@shared/constants/result-entry-source';
import { PLATFORM_CODES } from '@shared/constants/platform-codes';
import { FindContracts } from '@shared/interfaces/find-contracts.interface';
import { AccordionModule } from 'primeng/accordion';
import { SubmissionService } from '@shared/services/submission.service';

const OTHER_LEVER_ID = 9;

@Component({
  selector: 'app-create-oicr-form',
  templateUrl: './create-oicr-form.component.html',
  styleUrl: './create-oicr-form.component.scss',
  imports: [
    StepsModule,
    TextareaComponent,
    RadioButtonComponent,
    MultiselectComponent,
    MultiselectInstanceComponent,
    InputComponent,
    OicrFormFieldsComponent,
    NgTemplateOutlet,
    TooltipModule,
    OicrHeaderComponent,
    AccordionModule,
    DatePipe
  ],
  providers: [{ provide: LOCALE_ID, useValue: 'es' }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateOicrFormComponent implements OnInit {
  @ViewChildren(MultiselectInstanceComponent) multiselectInstances!: QueryList<MultiselectInstanceComponent>;

  createResultManagementService = inject(CreateResultManagementService);
  serviceLocator = inject(ServiceLocatorService);
  submissionService = inject(SubmissionService);
  getResultsService = inject(GetResultsService);
  allModalsService = inject(AllModalsService);
  wordCountService = inject(WordCountService);
  yearsService = inject(GetYearsService);

  // Accordion state
  isAccordionOpen = signal(false);
  accordionActiveState = signal<boolean | null>(null);
  shouldShowBottomBorder = signal(true); // Inicialmente true para acordeón cerrado
  private borderTimeout: ReturnType<typeof setTimeout> | null = null;
  private isFirstOpen = true; // Bandera para detectar primera apertura
  
  updateAccordionActiveState(active: boolean): void {
    queueMicrotask(() => {
      this.accordionActiveState.set(active);
      
      if (active) {
        if (this.isFirstOpen) {
          this.isFirstOpen = false;
        }
        if (this.borderTimeout) {
          clearTimeout(this.borderTimeout);
          this.borderTimeout = null;
        }
        this.shouldShowBottomBorder.set(false);
        return;
      }
      
      if (this.isFirstOpen) {
        this.shouldShowBottomBorder.set(true);
        this.isFirstOpen = false;
        return;
      }
      
      if (this.borderTimeout) {
        clearTimeout(this.borderTimeout);
      }
      this.shouldShowBottomBorder.set(false);
      this.borderTimeout = setTimeout(() => {
        this.shouldShowBottomBorder.set(true);
      }, 450);
    });
  }
  
  // Submission history data
  submissionHistory = signal<SubmissionHistoryItem[]>([]);
  actions = inject(ActionsService);
  elementRef = inject(ElementRef);
  cache = inject(CacheService);
  api = inject(ApiService);
  router = inject(Router);
  rolesService = inject(RolesService);
  projectResultsTableService = inject(ProjectResultsTableService);
  currentResultService = inject(CurrentResultService);
  step4opened = signal(false);
  filteredPrimaryContracts = signal<GetContracts[]>([]);
  contracts = signal<GetContractsExtended[]>([]);
  contractId: number | null = null;
  private isFirstSelect = true;
  environment = environment;
  loading = false;
  activeIndex = signal(0);
  headerDataLoading = signal(true);

  optionsDisabled: WritableSignal<Lever[]> = signal([]);
  primaryOptionsDisabled: WritableSignal<Lever[]> = signal([]);
  private readonly leverCustomNameSignals = new Map<string | number, WritableSignal<{ custom_lever_name: string }>>();

  public getContractStatusClasses = getContractStatusClasses;
  private stepSectionIds = [...CREATE_OICR_STEPPER_SECTIONS];

  isRegionsRequired = computed(() => isRegionsRequiredByScope(Number(this.createResultManagementService.createOicrBody().step_three.geo_scope_id)));
  isCountriesRequired = computed(() =>
    isCountriesRequiredByScope(Number(this.createResultManagementService.createOicrBody().step_three.geo_scope_id))
  );
  getMultiselectLabel = computed(() =>
    getGeoScopeMultiselectTexts(Number(this.createResultManagementService.createOicrBody().step_three.geo_scope_id))
  );
  isSubNationalRequired = computed(() =>
    isSubNationalRequiredByScope(Number(this.createResultManagementService.createOicrBody().step_three.geo_scope_id))
  );
  showSubnationalError = computed(() =>
    shouldShowSubnationalError(
      Number(this.createResultManagementService.createOicrBody().step_three.geo_scope_id),
      this.createResultManagementService.createOicrBody().step_three.countries
    )
  );

  leverServiceParams = computed((): GetLeversParams | undefined => {
    const rawYear =
      this.createResultManagementService.createOicrBody().base_information.year ||
      String(this.createResultManagementService.year() ?? '');
    const reportYear = Number(rawYear);

    return Number.isFinite(reportYear) && reportYear > 0 ? { reportYear } : undefined;
  });

  private readonly publishedStatusId = 14;

  showEditPublishedOicrButton = computed(
    () =>
      this.createResultManagementService.editingOicr() &&
      this.createResultManagementService.statusId() === this.publishedStatusId &&
      this.rolesService.isAdmin()
  );

  currentContract = computed(() => {
    const contractId = this.createResultManagementService.createOicrBody().base_information.contract_id;
    const contractsList = this.contracts();
    return contractsList.find(contract => contract.contract_id === String(contractId)) || null;
  });

  leverParts = computed(() => {
    const lever = this.currentContract()?.lever;
    if (!lever?.includes(':')) return { first: '', second: '' };
    const parts = lever.split(':');
    return { first: parts[0] || '', second: parts[1] || '' };
  });

  isHeaderDataLoaded = computed(() => {
    const contract = this.currentContract();
    const title = this.createResultManagementService.resultTitle();
    const statusId = this.createResultManagementService.statusId();
    
    return !this.headerDataLoading() && 
           contract !== null && 
           title !== null && 
           title !== undefined && 
           statusId !== null;
  });

  constructor() {
    this.createResultManagementService.stepItems.set(
      CREATE_OICR_STEPPER_ITEMS.map((item, idx) => ({
        ...item,
        command: () => this.onStepClick(idx, CREATE_OICR_STEPPER_SECTIONS[idx])
      }))
    );
  }

  ngOnInit() {
    if(this.createResultManagementService.statusId() === 11 || this.createResultManagementService.statusId() === 15) {
      this.api.GET_SubmitionHistory(this.cache.getCurrentNumericResultId()).then((response) => {
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          this.submissionHistory.set(response.data);
        }
      });
    }
  }

  stepOneCompletionEffect = effect(
    () => {
      const completed = this.isCompleteStepOne;
      this.createResultManagementService.stepItems.update(items =>
        items.map((item, idx) => (idx === 0 ? { ...item, styleClass: completed ? 'oicr-step1-complete' : '' } : item))
      );
    },
    { allowSignalWrites: true }
  );

  stepTwoCompletionEffect = effect(
    () => {
      const completed = this.isCompleteStepTwo;
      this.createResultManagementService.stepItems.update(items =>
        items.map((item, idx) => (idx === 1 ? { ...item, styleClass: completed ? 'oicr-step2-complete' : '' } : item))
      );
    },
    { allowSignalWrites: true }
  );

  stepThreeCompletionEffect = effect(
    () => {
      const completed = this.isCompleteStepThree;
      this.createResultManagementService.stepItems.update(items =>
        items.map((item, idx) => (idx === 2 ? { ...item, styleClass: completed ? 'oicr-step3-complete' : '' } : item))
      );
    },
    { allowSignalWrites: true }
  );

  onInit = effect(() => {
    if (this.createResultManagementService.resultPageStep() === 2) {
      this.allModalsService.setGoBackFunction(() => this.goBackToCreateResult());
    }
  });

  stepFourCompletionEffect = effect(
    () => {
      const completed =
        this.isCompleteStepOne &&
        this.isCompleteStepTwo &&
        this.isCompleteStepThree &&
        (this.createResultManagementService.editingOicr() ? true : this.step4opened());
      this.createResultManagementService.stepItems.update(items =>
        items.map((item, idx) => (idx === 3 ? { ...item, styleClass: completed ? 'oicr-step4-complete' : '' } : item))
      );
    },
    { allowSignalWrites: true }
  );

  updateOptionsDisabledEffect = effect(
    () => {
      const primaryLevers = this.createResultManagementService.createOicrBody().step_two?.primary_lever || [];
      this.optionsDisabled.set(primaryLevers);
    },
    { allowSignalWrites: true }
  );

  updatePrimaryOptionsDisabledEffect = effect(
    () => {
      const contributorLevers = this.createResultManagementService.createOicrBody().step_two?.contributor_lever || [];
      this.primaryOptionsDisabled.set([...this.createResultManagementService.oicrPrimaryOptionsDisabled(), ...contributorLevers]);
    },
    { allowSignalWrites: true }
  );

  onContractIdSync = effect(
    async () => {
      const contractId = this.createResultManagementService.contractId();
      if (contractId !== null) {
        this.headerDataLoading.set(true);
        this.createResultManagementService.createOicrBody.update(body => ({
          ...body,
          contract_id: contractId
        }));
        try {
          const response = await this.api.GET_FindContracts({ 'contract-code': contractId.toString() });
          if (response.successfulRequest && response.data) {
            const contractsWithId = response.data.data.map((contract: FindContracts) => ({
              ...contract,
              contract_id: contract.agreement_id
            }));
            this.contracts.set(contractsWithId as GetContractsExtended[]);
          }
        } catch (error) {
          console.error('Error loading contracts:', error);
        } finally {
          this.headerDataLoading.set(false);
        }
      }
    },
    { allowSignalWrites: true }
  );

  onActiveIndexChange(event: number) {
    this.activeIndex.set(event);
    if (event === 3) this.step4opened.set(true);
  }
  removeSubnationalRegion(country: Country, region: Region) {
    this.createResultManagementService.createOicrBody.update(current => {
      const removedId = removeSubnationalRegionFromCountries(current.step_three.countries, country.isoAlpha2, region.sub_national_id);
      const instance = this.multiselectInstances.find(m => m.endpointParams?.isoAlpha2 === country.isoAlpha2);
      if (removedId !== undefined) instance?.removeRegionById(removedId);
      return current;
    });
  }

  updateCountryRegions = (isoAlpha2: string, newRegions: Region[]) => {
    this.createResultManagementService.createOicrBody.update(current => {
      updateCountryRegions(current.step_three.countries, isoAlpha2, newRegions);
      return current;
    });
  };

  get isDisabled(): boolean {
    const b = this.createResultManagementService.createOicrBody();
    return (
      !b.base_information.title?.length ||
      !b.base_information.indicator_id ||
      !b.base_information.contract_id ||
      !b.base_information.year ||
      !this.isCompleteStepOne ||
      !this.isCompleteStepTwo ||
      !this.isCompleteStepThree
    );
  }

  get isCompleteStepOne(): boolean {
    const b = this.createResultManagementService.createOicrBody();
    const userIdValid = String(b.step_one.main_contact_person.user_id).trim().length > 0;
    const tagIdValid = b.step_one.tagging.tag_id > 0;
    const outcomeLen = (b.step_one.outcome_impact_statement ?? '').length;

    const showOicrSelection = b.step_one.tagging.tag_id === 2 || b.step_one.tagging.tag_id === 3;
    const oicrSelectionValid = !showOicrSelection || b.step_one.link_result.external_oicr_id > 0;

    return userIdValid && tagIdValid && outcomeLen > 0 && oicrSelectionValid;
  }

  get isCompleteStepTwo(): boolean {
    const b = this.createResultManagementService.createOicrBody();
    const primaryLevers = b.step_two?.primary_lever ?? [];
    if (primaryLevers.length === 0) {
      return false;
    }

    const contributorLevers = b.step_two?.contributor_lever ?? [];
    const allLevers = [...primaryLevers, ...contributorLevers];
    return allLevers.every(lever => {
      if (!this.isOtherLever(lever)) {
        return true;
      }

      const customName = this.getLeverCustomNameSignal(lever)().custom_lever_name?.trim();
      return !!customName;
    });
  }

  get isCompleteStepThree(): boolean {
    const b = this.createResultManagementService.createOicrBody();
    const geoScopeId = b.step_three.geo_scope_id;
    const multiselectLabels = this.getMultiselectLabel();

    const hasValidGeoScope = geoScopeId !== undefined && geoScopeId > 0;

    if (!hasValidGeoScope) {
      return false;
    }

    if (geoScopeId <= 1) {
      return true;
    }

    const hasValidRegions = !multiselectLabels.region.label || b.step_three.regions.length > 0;
    const hasValidCountries = !multiselectLabels.country.label || b.step_three.countries.length > 0;

    return hasValidRegions && hasValidCountries;
  }

  onContractIdChange(newContractId: number | null) {
    this.contractId = newContractId;
    this.createResultManagementService.createOicrBody.update(b => ({ ...b, contract_id: newContractId }));
  }

  onStepClick(stepIndex: number, sectionId: string) {
    this.activeIndex.set(stepIndex);
    this.scrollTo(sectionId);
  }

  private scrollTo(sectionId: string) {
    const el: HTMLElement | null = this.elementRef.nativeElement.querySelector(`#${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    }
  }

  onSelect = () => {
    this.createResultManagementService.createOicrBody.update(current => {
      mapCountriesToSubnationalSignals(current.step_three.countries);
      syncSubnationalArrayFromSignals(current.step_three.countries);
      return current;
    });
    if (this.createResultManagementService.autofillinOicr()) return;
    const currentId = Number(this.createResultManagementService.createOicrBody().step_three.geo_scope_id);

    if (!this.isFirstSelect && currentId === 5) {
      this.createResultManagementService.createOicrBody.update(value => ({
        ...value,
        step_three: {
          ...value.step_three
        }
      }));
    }

    this.isFirstSelect = false;
  };

  initializeCountriesWithSignals = effect(() => {
    const countries = this.createResultManagementService.createOicrBody().step_three.countries;
    if (countries && countries.length > 0) {
      const needsInitialization = countries.some(country => !country.result_countries_sub_nationals_signal);

      if (needsInitialization) {
        this.createResultManagementService.createOicrBody.update(current => {
          mapCountriesToSubnationalSignals(current.step_three.countries);
          return current;
        });
      }
    }
  });

  async createResult() {
    const payload = this.buildOicrPayloadWithCustomLeverNames();
    const response = await this.api.POST_CreateOicr(
      payload,
      this.createResultManagementService.currentRequestedResultCode() || undefined
    );
    // clean currentRequestedResultCode

    if (response.status !== 200 && response.status !== 201) {
      this.actions.handleBadRequest(response, () => {
        this.createResultManagementService.resultPageStep.set(0);
      });
    } else {
      this.actions.showGlobalAlert({
        severity: 'success',
        summary: `Thank you for ${(this.createResultManagementService.currentRequestedResultCode() && 'update') || ''} your submission`,
        hasNoCancelButton: true,
        detail:
          'Your OICR will be reviewed by PISA-SPRM and the assigned regional MEL specialist will reach out to support you in finalizing the next steps of the OICR development process.',
        confirmCallback: {
          label: 'Done',
          event: () => {
            // Modern Angular approach - Navigate with reload
            const isOicr = this.createResultManagementService.createOicrBody().base_information.indicator_id === 5;
            const fromResultsCenter = this.createResultManagementService.resultCreationEntryContext() === 'results-center';
            let targetRoute: (string | number)[];
            if (isOicr) {
              targetRoute = fromResultsCenter
                ? ['/results-center']
                : [
                    'project-detail/',
                    this.createResultManagementService.createOicrBody()?.base_information?.contract_id ?? ''
                  ];
            } else {
              targetRoute = ['result', response.data.result_official_code];
            }

            // Navigate to results-center first to ensure component refresh
            const navigate = () => {
              this.router.navigate(targetRoute, {
                replaceUrl: true,
                onSameUrlNavigation: 'reload'
              });
              this.allModalsService.closeModal('createResult');
              this.getResultsService.updateList();
              this.createResultManagementService.currentRequestedResultCode.set(null);
              this.cache.projectResultsSearchValue.set(this.createResultManagementService.createOicrBody().base_information.title);
              this.createResultManagementService.clearOicrBody();
              this.createResultManagementService.setStatusId(null);
            };

            if (
              this.createResultManagementService.createOicrBody().base_information.indicator_id === 5 &&
              this.router.url.includes('/project-detail/')
            ) {
              this.router.navigate(['/home']).then(() => {
                // Then navigate to the target with a small delay
                setTimeout(() => {
                  navigate();
                }, 300);
              });
            } else {
              navigate();
            }
          }
        }
      });
    }
  }

  goNext() {
    const current = this.activeIndex();
    const lastIndex = this.createResultManagementService.stepItems().length - 1;
    if (current < lastIndex) {
      const next = current + 1;
      const sectionId = this.stepSectionIds[next] ?? this.stepSectionIds[0];
      this.onStepClick(next, sectionId);
      if (next === 3) this.step4opened.set(true);
    }
  }

  goBack() {
    const current = this.activeIndex();
    if (current > 0) {
      const prev = current - 1;
      const sectionId = this.stepSectionIds[prev] ?? this.stepSectionIds[0];
      this.onStepClick(prev, sectionId);
    }
  }

  goBackToCreateResult() {
    this.createResultManagementService.setModalTitle('Create A Result');
    this.createResultManagementService.resultPageStep.set(0);
    this.createResultManagementService.setStatusId(null);
  }

  async openFullOicrEdit(): Promise<void> {
    const resultCode = this.createResultManagementService.currentRequestedResultCode();
    if (!resultCode) {
      return;
    }

    const queryParams: Record<string, string> = {
      [OICR_FULL_EDIT_QUERY]: OICR_FULL_EDIT_VALUE
    };
    if (this.createResultManagementService.resultCreationEntryContext() === 'results-center') {
      queryParams[RESULT_ENTRY_SOURCE_QUERY] = RESULT_ENTRY_SOURCE_VALUE_RESULTS_CENTER;
    }

    this.createResultManagementService.editingOicr.set(false);
    this.allModalsService.closeModal('createResult');

    await this.router.navigate(['/result', `${PLATFORM_CODES.STAR}-${resultCode}`, 'oicr-details'], {
      queryParams
    });
  }

  isGeoScopeId(value: number | string): boolean {
    return Number(this.createResultManagementService.createOicrBody().step_three.geo_scope_id) === value;
  }

  clearOicrSelection(): void {
    this.createResultManagementService.createOicrBody.update(current => ({
      ...current,
      step_one: {
        ...current.step_one,
        link_result: { external_oicr_id: 0 }
      }
    }));
  }

  openSubmitResultModal() {
    this.allModalsService.disablePostponeOption.set(false);
    this.allModalsService.disableRejectOption.set(false);
    this.allModalsService.setSubmitResultOrigin('latest');
    this.allModalsService.closeModal('createResult');
    this.allModalsService.setSubmitBackStep(this.activeIndex());
    const contract = this.currentContract?.();
    
    // Map the new lever structure - levers come directly in the contract object
    const levers = contract?.levers ? {
      id: contract.levers.id,
      full_name: contract.levers.full_name,
      short_name: contract.levers.short_name,
      other_names: contract.levers.other_names,
      lever_url: contract.levers.lever_url
    } : null;
    
    this.allModalsService.setSubmitHeader({
      title: this.createResultManagementService.resultTitle?.() || this.createResultManagementService.createOicrBody()?.base_information?.title || undefined,
      agreement_id: contract?.agreement_id,
      description: contract?.description,
      project_lead_description: contract?.project_lead_description,
      start_date: contract?.start_date,
      endDateGlobal: contract?.endDateGlobal || undefined,
      levers: levers || undefined,
      status_id: this.createResultManagementService.statusId()?.toString() || undefined
    });
    
    // Set up the cancel action to call handleSubmitBack
    this.allModalsService.setSubmitBackAction(() => this.handleSubmitBack());
    
    this.allModalsService.openModal('submitResult');
  }

  openSubmitResultModalForReviewAgain() {
    const statusId = this.createResultManagementService.statusId();
    // If current status is Postponed (11), disable Postpone in the modal.
    // If current status is Rejected (15), disable Reject in the modal.
    this.allModalsService.disablePostponeOption.set(statusId === 11);
    this.allModalsService.disableRejectOption.set(statusId === 15);
    this.allModalsService.setSubmitResultOrigin('latest');
    this.allModalsService.closeModal('createResult');
    this.allModalsService.setSubmitBackStep(this.activeIndex());
    const contract = this.currentContract?.();
    
    // Map the new lever structure - levers come directly in the contract object
    const levers = contract?.levers ? {
      id: contract.levers.id,
      full_name: contract.levers.full_name,
      short_name: contract.levers.short_name,
      other_names: contract.levers.other_names,
      lever_url: contract.levers.lever_url
    } : null;
    
    this.allModalsService.setSubmitHeader({
      title: this.createResultManagementService.resultTitle?.() || this.createResultManagementService.createOicrBody()?.base_information?.title || undefined,
      agreement_id: contract?.agreement_id,
      description: contract?.description,
      project_lead_description: contract?.project_lead_description,
      start_date: contract?.start_date,
      endDateGlobal: contract?.endDateGlobal || undefined,
      levers: levers || undefined,
      status_id: this.createResultManagementService.statusId()?.toString() || undefined
    });
    
    // Set up the cancel action to call handleSubmitBack
    this.allModalsService.setSubmitBackAction(() => this.handleSubmitBack());
    
    this.allModalsService.openModal('submitResult');
  }

  async handleSubmitBack(): Promise<void> {
    // Clean up all data when canceling
    this.allModalsService.setSubmitResultOrigin(null);
    this.allModalsService.setSubmitHeader(null);
    this.allModalsService.setSubmitBackStep(null);
    this.allModalsService.clearSubmissionData();
    this.allModalsService.submitBackAction = undefined;
    this.allModalsService.createResultManagementService.resetModal();
    
    this.allModalsService.closeModal('submitResult');
    
    const currentMetadata = this.cache.currentMetadata();
    if (currentMetadata?.indicator_id && currentMetadata?.status_id) {
      const resultCode = this.cache.getCurrentNumericResultId();
      const fromResultsCenter = isResultsCenterEntryFromUrl(this.router.url);
      await this.currentResultService.openEditRequestdOicrsModal(
        currentMetadata.indicator_id,
        currentMetadata.status_id,
        resultCode,
        fromResultsCenter ? 'results-center' : 'project'
      );
    }
  }

  getStatusIdAsString(): string {
    return String(this.createResultManagementService.statusId() || 9);
  }

  getStatusIcon(): string {
    const statusId = this.createResultManagementService.statusId();
    
    switch (statusId) {
      case 11: 
        return 'pi pi-minus-circle';
      case 15: 
        return 'pi pi-times-circle';
      default: 
        return 'pi pi-check-circle';
    }
  }

  onAccordionToggle(event: number | number[] | null) {
    if (event === null || (Array.isArray(event) && event.length === 0)) {
      this.isAccordionOpen.set(false);
      if (this.isFirstOpen) {
        this.shouldShowBottomBorder.set(true);
        this.isFirstOpen = false;
      } else {
        if (this.borderTimeout) {
          clearTimeout(this.borderTimeout);
        }
        this.shouldShowBottomBorder.set(false);
        this.borderTimeout = setTimeout(() => {
          this.shouldShowBottomBorder.set(true);
        }, 450);
      }
      return;
    }
    const index = Array.isArray(event) ? event[0] : event;
    const isOpening = index === 0;
    this.isAccordionOpen.set(isOpening);
    
    if (isOpening) {
      if (this.isFirstOpen) {
        this.isFirstOpen = false;
      }
      if (this.borderTimeout) {
        clearTimeout(this.borderTimeout);
        this.borderTimeout = null;
      }
      this.shouldShowBottomBorder.set(false);
    }
  }

  getFirstHistoryItem() {
    const history = this.submissionHistory();
    return history.length > 0 ? history[0] : null;
  }

  getReviewerFullName() {
    const item = this.getFirstHistoryItem();
    if (item?.created_by_object) {
      const firstName = item.created_by_object.first_name || '';
      const lastName = item.created_by_object.last_name || '';
      return ` ${lastName}, ${firstName}`.trim();
    }
    return '';
  }

  getSubmissionComment() {
    const item = this.getFirstHistoryItem();
    return item?.submission_comment || '';
  }

  getUpdatedDate() {
    const item = this.getFirstHistoryItem();
    return item?.updated_at || '';
  }

  isOtherLever(lever: Lever): boolean {
    return Number(lever.lever_id) === OTHER_LEVER_ID;
  }

  getLeverCustomNameSignal(lever: Lever) {
    let customNameSignal = this.leverCustomNameSignals.get(lever.lever_id);
    if (!customNameSignal) {
      customNameSignal = signal({ custom_lever_name: lever.custom_lever_name ?? '' });
      this.leverCustomNameSignals.set(lever.lever_id, customNameSignal);
    }
    return customNameSignal;
  }

  private buildOicrPayloadWithCustomLeverNames() {
    const body = this.createResultManagementService.createOicrBody();

    if (!body.step_two) {
      return body;
    }

    return {
      ...body,
      step_two: {
        ...body.step_two,
        primary_lever: this.mapLeversWithCustomNames(body.step_two.primary_lever),
        contributor_lever: this.mapLeversWithCustomNames(body.step_two.contributor_lever)
      }
    };
  }

  private mapLeversWithCustomNames(levers: Lever[] | undefined): Lever[] {
    if (!levers?.length) {
      return levers ?? [];
    }

    return levers.map(lever => {
      if (!this.isOtherLever(lever)) {
        const leverWithoutCustomName = { ...lever };
        delete leverWithoutCustomName.custom_lever_name;
        return leverWithoutCustomName;
      }

      const custom_lever_name = (
        this.getLeverCustomNameSignal(lever)().custom_lever_name ??
        lever.custom_lever_name ??
        ''
      ).trim();

      return { ...lever, custom_lever_name };
    });
  }
}
