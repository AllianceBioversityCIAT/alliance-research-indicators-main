import { Component, inject, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CacheService } from '../../../../../../shared/services/cache/cache.service';
import { ApiService } from '../../../../../../shared/services/api.service';
import { RadioButtonComponent } from '@shared/components/custom-fields/radio-button/radio-button.component';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { SubmissionService } from '@shared/services/submission.service';
import { PatchIpOwner } from '@shared/interfaces/patch-ip-owners';
import { ActionsService } from '@shared/services/actions.service';
import { ActivatedRoute, Router } from '@angular/router';
import { VersionWatcherService } from '@shared/services/version-watcher.service';
import { FormHeaderComponent } from '@shared/components/form-header/form-header.component';
import { NavigationButtonsComponent } from '@shared/components/navigation-buttons/navigation-buttons.component';

@Component({
  selector: 'app-ip-rights',
  imports: [NavigationButtonsComponent, FormsModule, FormHeaderComponent, RadioButtonComponent, InputComponent],
  templateUrl: './ip-rights.component.html'
})
export default class IpRightsComponent {
  api = inject(ApiService);
  router = inject(Router);
  body: WritableSignal<PatchIpOwner> = signal({});
  cache = inject(CacheService);
  actions = inject(ActionsService);
  loading = signal(false);
  submission = inject(SubmissionService);
  versionWatcher = inject(VersionWatcherService);
  route = inject(ActivatedRoute);

  constructor() {
    this.versionWatcher.onVersionChange(() => {
      this.getData();
    });
  }
  async getData() {
    this.loading.set(true);
    const response = await this.api.GET_IpOwner(this.cache.getCurrentNumericResultId());
    const fieldsToNormalize = ['publicity_restriction', 'potential_asset', 'requires_futher_development'] as const;

    const normalized = { ...response.data };

    fieldsToNormalize.forEach(field => {
      const value = response.data[field];
      let normalizedValue: number | undefined;
      if (value === true) {
        normalizedValue = 1;
      } else if (value === false) {
        normalizedValue = 0;
      } else {
        normalizedValue = undefined;
      }
      normalized[field] = normalizedValue;
    });

    this.body.set(normalized);
    this.loading.set(false);
  }

  async saveData(page?: 'back'): Promise<void> {
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

    if (this.submission.isEditableStatus()) {
      const current = this.body();

      if (current.asset_ip_owner !== 4) {
        current.asset_ip_owner_description = null;
      }

      current.publicity_restriction_description = current.publicity_restriction ? current.publicity_restriction_description : null;
      current.potential_asset_description = current.potential_asset ? current.potential_asset_description : null;
      current.requires_futher_development_description = current.requires_futher_development ? current.requires_futher_development_description : null;

      this.body.set({ ...current });

      const response = await this.api.PATCH_IpOwners(numericResultId, this.body());
      if (!response.successfulRequest) {
        this.loading.set(false);
        return;
      }

      await this.getData();

      this.actions.showToast({
        severity: 'success',
        summary: 'IP rights',
        detail: 'Data saved successfully'
      });
    }

    if (page === 'back') navigateTo('evidence');

    this.loading.set(false);
  }
}
