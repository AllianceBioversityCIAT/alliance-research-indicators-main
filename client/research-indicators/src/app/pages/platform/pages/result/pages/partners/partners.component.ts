import { Component, inject, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActionsService } from '@services/actions.service';
import { CacheService } from '@services/cache/cache.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Institution, PatchPartners } from '@interfaces/patch-partners.interface';
import { ApiService } from '@services/api.service';
import { MultiselectComponent } from '../../../../../../shared/components/custom-fields/multiselect/multiselect.component';
import { PartnerSelectedItemComponent } from '../../../../../../shared/components/partner-selected-item/partner-selected-item.component';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { GetInstitution } from '@shared/interfaces/get-institutions.interface';
import { SubmissionService } from '@shared/services/submission.service';
import { FormHeaderComponent } from '@shared/components/form-header/form-header.component';
import { VersionWatcherService } from '@shared/services/version-watcher.service';
import { NavigationButtonsComponent } from '@shared/components/navigation-buttons/navigation-buttons.component';
import { CheckboxModule } from 'primeng/checkbox';

@Component({
  selector: 'app-partners',
  imports: [NavigationButtonsComponent, FormHeaderComponent, FormsModule, MultiselectComponent, PartnerSelectedItemComponent, CheckboxModule],
  templateUrl: './partners.component.html'
})
export default class PartnersComponent {
  actions = inject(ActionsService);
  cache = inject(CacheService);
  router = inject(Router);
  api = inject(ApiService);
  allModalsService = inject(AllModalsService);
  body = signal<PatchPartners>(new PatchPartners());
  loading = signal(false);
  submission = inject(SubmissionService);
  versionWatcher = inject(VersionWatcherService);
  route = inject(ActivatedRoute);

  optionsDisabled: WritableSignal<Institution[]> = signal([]);

  constructor() {
    this.versionWatcher.onVersionChange(() => {
      this.getData();
    });
  }

  canRemoveInstitution = (item: GetInstitution): boolean => {
    return item?.institution_role_id === 3 || item?.institution_role_id == null;
  };

  canRemove = (): boolean => {
    return this.submission.isEditableStatus();
  };

  async getData() {
    this.loading.set(true);
    const response = await this.api.GET_Partners(this.cache.getCurrentNumericResultId());
    this.body.set(response.data);
    this.optionsDisabled.set(response.data.institutions.filter(institution => institution.institution_role_id !== 3));
    this.loading.set(false);
  }

  async saveData(page?: 'next' | 'back') {
    this.loading.set(true);

    const numericResultId = this.cache.getCurrentNumericResultId();
    const version = this.route.snapshot.queryParamMap.get('version');
    const queryParams = version ? { version } : undefined;

    const navigateTo = (path: string) => {
      this.router.navigate(['result', this.cache.currentResultId(), path], {
        queryParams,
        replaceUrl: true
      });
    };

    const backPath = this.cache.currentResultIndicatorSectionPath();

    if (this.submission.isEditableStatus()) {
      const response = await this.api.PATCH_Partners(numericResultId, this.body());
      if (response.successfulRequest) {
        this.actions.showToast({
          severity: 'success',
          summary: 'Partners',
          detail: 'Data saved successfully'
        });
        await this.getData();
      }
    }
    if (page === 'back') navigateTo(backPath);
    if (page === 'next') navigateTo('geographic-scope');
    this.loading.set(false);
  }

  setSectionAndOpenModal(section: string) {
    this.allModalsService.setPartnerRequestSection(section);
    this.allModalsService.openModal('requestPartner');
  }
}
