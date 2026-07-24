import { ChangeDetectionStrategy, Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ServiceLocatorService } from '@shared/services/service-locator.service';
import { Result } from '@shared/interfaces/result/result.interface';
import { ApiService } from '@shared/services/api.service';
import { ActionsService } from '@shared/services/actions.service';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { Router } from '@angular/router';
import { environment } from '@envs/environment';
import { GetClarisaInstitutionsTypesChildlessService } from '@shared/services/get-clarisa-institutions-type-childless.service';
import { GetCountriesService } from '@shared/services/control-list/get-countries.service';
import { CacheService } from '@shared/services/cache/cache.service';

@Component({
  selector: 'app-request-partner-modal',
  imports: [FormsModule, InputTextModule, SelectModule, ButtonModule],
  templateUrl: './request-partner-modal.component.html',
  styleUrls: ['./request-partner-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RequestPartnerModalComponent implements OnInit {
  body = signal<{
    acronym: string | null;
    name: string | null;
    institutionTypeCode: string | null;
    hqCountryIso: string | null;
    websiteLink: string | null;
    externalUserComments: string | null;
  }>({
    acronym: null,
    name: null,
    institutionTypeCode: null,
    hqCountryIso: null,
    websiteLink: null,
    externalUserComments: null
  });

  loading = signal(false);
  serviceInstitutionsTypes!: GetClarisaInstitutionsTypesChildlessService;
  serviceCountries!: GetCountriesService;

  serviceLocator = inject(ServiceLocatorService);
  api = inject(ApiService);
  actions = inject(ActionsService);
  allModalsService = inject(AllModalsService);
  router = inject(Router);
  cache = inject(CacheService);

  readonly isPartnerConfirmDisabled = computed(
    () =>
      !this.body().name ||
      !this.body().institutionTypeCode ||
      !this.body().hqCountryIso ||
      !this.validateWebsite(this.body().websiteLink ?? '') ||
      this.loading()
  );

  constructor() {
    this.allModalsService.setCreatePartner(() => this.createPartner());
    this.allModalsService.setDisabledConfirmPartner(() => this.isPartnerConfirmDisabled());
  }

  ngOnInit() {
    this.serviceInstitutionsTypes = this.serviceLocator.getService(
      'clarisaInstitutionsTypesChildless'
    ) as GetClarisaInstitutionsTypesChildlessService;
    this.serviceCountries = this.serviceLocator.getService('countries') as GetCountriesService;
  }

  validateWebsite = (website: string): boolean => {
    if (!website || website.trim() === '') {
      return true;
    }
    const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/[\w\-./?%&=]*)?$/;
    return urlPattern.test(website.trim());
  };

  setValue(value: string) {
    value = value.toLowerCase();
    this.body.set({
      ...this.body(),
      websiteLink: value
    });
  }

  async createPartner() {
    if (
      !this.body().name ||
      !this.body().institutionTypeCode ||
      !this.body().hqCountryIso ||
      !this.validateWebsite(this.body().websiteLink ?? '') ||
      this.loading()
    ) {
      return;
    }

    this.loading.set(true);
    this.body().externalUserComments = 
    'Username: ' + this.cache.dataCache().user.first_name + ' ' + this.cache.dataCache().user.last_name + 
    ' | User ID: ' + this.cache.dataCache().user.sec_user_id + 
    ' | Result code: ' + this.cache.currentMetadata().result_official_code + 
    ' | Section: '+ this.allModalsService.partnerRequestSection();
    
    const result = await this.api.POST_PartnerRequest({
      ...this.body(),
      platformUrl: `${environment.frontBaseUrl}${this.router.url}`
    });

    if (result.successfulRequest) {
      this.successRequest();
    } else {
      this.badRequest(result);
    }
    this.loading.set(false);
  }

  successRequest = () => {
    this.actions.showToast({
      severity: 'success',
      summary: 'Success',
      detail: `Partner request sent successfully`
    });
    this.allModalsService.closeModal('requestPartner');
    this.body.set({ acronym: null, name: null, institutionTypeCode: null, hqCountryIso: null, websiteLink: null, externalUserComments: null });
  };

  badRequest = (result: MainResponse<Result>) => {
    const isWarning = result.status == 409;
    this.actions.showGlobalAlert({
      severity: isWarning ? 'warning' : 'error',
      summary: isWarning ? 'Warning' : 'Error',
      detail: isWarning ? `${result.errorDetail.errors}` : result.errorDetail.errors
    });
  };
}
