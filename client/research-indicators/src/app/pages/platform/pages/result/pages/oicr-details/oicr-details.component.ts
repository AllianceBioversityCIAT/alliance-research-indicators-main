import { Component, inject, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CacheService } from '../../../../../../shared/services/cache/cache.service';
import { ApiService } from '../../../../../../shared/services/api.service';
import { SubmissionService } from '@shared/services/submission.service';
import { ActionsService } from '@shared/services/actions.service';
import { ActivatedRoute, Router } from '@angular/router';
import { VersionWatcherService } from '@shared/services/version-watcher.service';
import { FormHeaderComponent } from '@shared/components/form-header/form-header.component';
import { NavigationButtonsComponent } from '@shared/components/navigation-buttons/navigation-buttons.component';
import { OicrFormFieldsComponent } from '@shared/components/custom-fields/oicr-form-fields/oicr-form-fields.component';
import { PatchOicr, QuantificationPayload } from '@shared/interfaces/oicr-creation.interface';
import { QuantificationItemComponent, QuantificationItemData } from './components/quantification-item/quantification-item.component';
import { CheckboxModule } from 'primeng/checkbox';
import { AccordionModule } from 'primeng/accordion';
import { AuthorsContactPersonsTableComponent } from './components/authors-contact-persons-table/authors-contact-persons-table.component';
import { ContactPersonRow, ContactPersonResponse, ContactPersonFormData } from '@shared/interfaces/contact-person.interface';
import { NgTemplateOutlet } from '@angular/common';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { ImpactAreasComponent } from './components/impact-areas/impact-areas.component';
import { SelectComponent } from '@shared/components/custom-fields/select/select.component';
import { RolesService } from '@shared/services/cache/roles.service';
import { ServiceLocatorService } from '@shared/services/service-locator.service';

@Component({
  selector: 'app-oicr-details',
  imports: [NavigationButtonsComponent, FormsModule, FormHeaderComponent, CheckboxModule, AccordionModule, NgTemplateOutlet, AuthorsContactPersonsTableComponent, OicrFormFieldsComponent, QuantificationItemComponent, InputComponent, ImpactAreasComponent, SelectComponent],
  templateUrl: './oicr-details.component.html'
})
export default class OicrDetailsComponent {
  rolesService = inject(RolesService);
  api = inject(ApiService);
  router = inject(Router);
  serviceLocator = inject(ServiceLocatorService);
  body: WritableSignal<PatchOicr> = signal({
    oicr_internal_code: '',
    tagging: { tag_id: 0 },
    outcome_impact_statement: '',
    short_outcome_impact_statement: '',
    sharepoint_link: '',
    mel_regional_expert: undefined,
    maturity_level_id: 0,
    link_result: { external_oicr_id: 0 },
    for_external_use: false,
    for_external_use_description: ''
  });

  quantifications = signal<QuantificationItemData[]>([]);
  extrapolatedEstimates = signal<QuantificationItemData[]>([]);
  contactPersons = signal<ContactPersonRow[]>([]);

  addQuantification() {
    if (!this.submission.isEditableStatus()) return;
    this.quantifications.update(list => [...list, { number: null, unit: '', comments: '' }]);
  }

  removeQuantification(index: number) {
    if (!this.submission.isEditableStatus()) return;
    this.quantifications.update(list => list.filter((_, i) => i !== index));
  }

  updateQuantification(index: number, data: QuantificationItemData) {
    this.quantifications.update(list => list.map((q, i) => (i === index ? data : q)));
  }

  addExtrapolatedEstimate() {
    if (!this.submission.isEditableStatus()) return;
    this.extrapolatedEstimates.update(list => [...list, { number: null, unit: '', comments: '' }]);
  }

  removeExtrapolatedEstimate(index: number) {
    if (!this.submission.isEditableStatus()) return;
    this.extrapolatedEstimates.update(list => list.filter((_, i) => i !== index));
  }

  updateExtrapolatedEstimate(index: number, data: QuantificationItemData) {
    this.extrapolatedEstimates.update(list => list.map((it, i) => (i === index ? data : it)));
  }

  onAddContactPerson() {
    this.allModalsService.toggleModal('addContactPerson');
  }

  async loadContactPersons() {
    const res = await this.api.GET_AutorContact(this.cache.getCurrentNumericResultId());
    
    let dataArray: ContactPersonResponse[] = [];
    if (res.data) {
      if (Array.isArray(res.data)) {
        dataArray = res.data;
      } else {
        dataArray = [res.data];
      }
    }
    
    const mappedData: ContactPersonRow[] = dataArray.map((item: ContactPersonResponse) => ({
      id: item.result_user_id,
      name: `${item.user?.first_name || ''} ${item.user?.last_name || ''}`.trim(),
      position: item.user?.position || '-',
      affiliation: item.user?.affiliation || item.user?.center || '-',
      email: item.user?.email || '-',
      role: item.informativeRole?.name || '-',
      user_id: item.user_id,
      informative_role_id: item.informative_role_id
    }));
    
    this.contactPersons.set(mappedData);
  }

  async onDeleteContactPerson(row: ContactPersonRow) {
    if (!row?.id) return;
    const resultId = this.cache.getCurrentNumericResultId();
    const res = await this.api.DELETE_AutorContact(row.id, resultId);
    if (res.successfulRequest) {
      await this.loadContactPersons();
      this.actions.showToast({ severity: 'success', summary: 'Contact person', detail: 'Deleted successfully' });
    }
  }

  cache = inject(CacheService);
  actions = inject(ActionsService);
  loading = signal(false);
  submission = inject(SubmissionService);
  versionWatcher = inject(VersionWatcherService);
  route = inject(ActivatedRoute);
  allModalsService = inject(AllModalsService);

  constructor() {
    this.versionWatcher.onVersionChange(() => {
      this.getData();
    });
    this.setupModalActions();
  }

  setupModalActions() {
    this.allModalsService.setAddContactPersonConfirm((data: ContactPersonFormData) => this.onConfirmAddContactPerson(data));
    this.allModalsService.setDisabledAddContactPerson(() => this.isAddContactPersonDisabled());
  }

  isAddContactPersonDisabled(): boolean {
    return !this.submission.isEditableStatus();
  }

  async onConfirmAddContactPerson(data: ContactPersonFormData) {
    if (!data?.contact_person_id || !data?.role_id) {
      this.actions.showToast({ severity: 'error', summary: 'Error', detail: 'Please select both contact person and role' });
      return;
    }
    
    const contactPersonData = {
      user_id: data.contact_person_id,
      informative_role_id: data.role_id
    };
    
    try {
      await this.api.POST_AutorContact(contactPersonData, this.cache.getCurrentNumericResultId());
      await this.loadContactPersons();
      this.actions.showToast({ severity: 'success', summary: 'Contact person', detail: 'Added successfully' });
      this.allModalsService.toggleModal('addContactPerson');
    } catch {
      this.actions.showToast({ severity: 'error', summary: 'Error', detail: 'Failed to add contact person' });
    }
  }

  async getData() {
    this.loading.set(true);
    const response = await this.api.GET_Oicr(this.cache.getCurrentNumericResultId());
    this.loadContactPersons()
    const data = response.data || {};
    const apiData = data;

    this.body.set(data);

    // Map quantifications (actual_count)
    const apiActual = Array.isArray(apiData.actual_count) ? apiData.actual_count : [];
    if (apiActual.length > 0) {
      this.quantifications.set(
        apiActual.map((q: QuantificationPayload) => {
          let parsedNumber: number | null = null;
          const raw = q?.quantification_number as unknown as number | string | null | undefined;
          if (typeof raw === 'number') parsedNumber = raw;
          else if (raw !== undefined && raw !== null) {
            const n = Number(raw);
            parsedNumber = Number.isNaN(n) ? null : n;
          }
          return {
            number: parsedNumber,
            unit: q?.unit ?? '',
            comments: q?.description ?? ''
          };
        })
      );
    } else {
      this.quantifications.set([]);
    }

    const apiExtrap = Array.isArray(apiData.extrapolate_estimates) ? apiData.extrapolate_estimates : [];
    if (apiExtrap.length > 0) {
      this.extrapolatedEstimates.set(
        apiExtrap.map((q: QuantificationPayload) => {
          let parsedNumber: number | null = null;
          const raw = q?.quantification_number as unknown as number | string | null | undefined;
          if (typeof raw === 'number') parsedNumber = raw;
          else if (raw !== undefined && raw !== null) {
            const n = Number(raw);
            parsedNumber = Number.isNaN(n) ? null : n;
          }
          return {
            number: parsedNumber,
            unit: q?.unit ?? '',
            comments: q?.description ?? ''
          };
        })
      );
    } else {
      this.extrapolatedEstimates.set([]);
    }

    // Map result_impact_areas
    const apiImpactAreas = Array.isArray(apiData.result_impact_areas) ? apiData.result_impact_areas : [];
    if (apiImpactAreas.length > 0) {
      const mappedImpactAreas = apiImpactAreas.map(
        (ia: {
          impact_area_id: number;
          impact_area_score_id: number | undefined;
          result_impact_area_global_targets?: { global_target_id: number }[];
          global_target_id?: number;
          global_target_ids?: number[];
        }) => {
          let result_impact_area_global_targets: { global_target_id: number }[] | undefined;
          if (Array.isArray(ia.result_impact_area_global_targets) && ia.result_impact_area_global_targets.length > 0) {
            result_impact_area_global_targets = ia.result_impact_area_global_targets.map(t => ({
              global_target_id: t.global_target_id
            }));
          } else if (Array.isArray(ia.global_target_ids) && ia.global_target_ids.length > 0) {
            result_impact_area_global_targets = ia.global_target_ids.map(global_target_id => ({ global_target_id }));
          } else if (ia.global_target_id != null && ia.global_target_id !== undefined) {
            result_impact_area_global_targets = [{ global_target_id: ia.global_target_id }];
          } else {
            result_impact_area_global_targets = undefined;
          }
          return {
            impact_area_id: ia.impact_area_id,
            impact_area_score_id: ia.impact_area_score_id,
            result_impact_area_global_targets
          };
        }
      );
      
      // Update the body with the mapped impact areas
      const currentBody = this.body();
      currentBody.result_impact_areas = mappedImpactAreas;
      this.body.set({ ...currentBody });
    }

    this.loading.set(false);
  }

  async saveData(page?: 'back' | 'next'): Promise<void> {
    try {
      this.loading.set(true);
      const numericResultId = this.cache.getCurrentNumericResultId();
      const version = this.route.snapshot.queryParamMap.get('version');
      const queryParams = version ? { version } : undefined;

      if (this.submission.isEditableStatus()) {
        const current = this.body();

        const payload: PatchOicr = {
          ...current,
          actual_count: this.quantifications().map<QuantificationPayload>(q => ({
            quantification_number: q.number ?? 0,
            unit: q.unit ?? '',
            description: q.comments ?? ''
          })),
          extrapolate_estimates: this.extrapolatedEstimates().map<QuantificationPayload>(q => ({
            quantification_number: q.number ?? 0,
            unit: q.unit ?? '',
            description: q.comments ?? ''
          })),
          result_impact_areas: current.result_impact_areas || []
        };

        const response = await this.api.PATCH_Oicr(numericResultId, payload);

        if (!response.successfulRequest) {
          return;
        }

        await this.getData();
        this.actions.showToast({
          severity: 'success',
          summary: 'OICR Details',
          detail: 'Data saved successfully'
        });
      }

      if (page === 'back') {
        this.router.navigate(['result', this.cache.currentResultId(), 'alliance-alignment'], {
          queryParams,
          replaceUrl: true
        });
      }
      if (page === 'next')
        this.router.navigate(['result', this.cache.currentResultId(), 'partners'], {
          queryParams,
          replaceUrl: true
        });
    } finally {
      this.loading.set(false);
    }
  }

  clearOicrSelection(): void {
    this.body.update(current => ({
      ...current,
      link_result: { external_oicr_id: 0 }
    }));
  }
}
