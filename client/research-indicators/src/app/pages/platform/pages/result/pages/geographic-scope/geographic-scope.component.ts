import { Component, computed, inject, QueryList, signal, ViewChildren, WritableSignal } from '@angular/core';
import { RadioButtonComponent } from '../../../../../../shared/components/custom-fields/radio-button/radio-button.component';
import { ApiService } from '../../../../../../shared/services/api.service';
import { MultiselectComponent } from '../../../../../../shared/components/custom-fields/multiselect/multiselect.component';
import { CacheService } from '../../../../../../shared/services/cache/cache.service';
import { Country, GetGeoLocation, Region } from '../../../../../../shared/interfaces/get-geo-location.interface';
import { ActionsService } from '../../../../../../shared/services/actions.service';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../../../../environments/environment';
import { MultiselectInstanceComponent } from '../../../../../../shared/components/custom-fields/multiselect-instance/multiselect-instance.component';
import { SubmissionService } from '@shared/services/submission.service';
import { VersionWatcherService } from '@shared/services/version-watcher.service';
import { FormHeaderComponent } from '@shared/components/form-header/form-header.component';
import { NavigationButtonsComponent } from '@shared/components/navigation-buttons/navigation-buttons.component';
import {
  getGeoScopeMultiselectTexts,
  isRegionsRequiredByScope,
  isCountriesRequiredByScope,
  isSubNationalRequiredByScope,
  mapCountriesToSubnationalSignals,
  removeSubnationalRegionFromCountries,
  syncSubnationalArrayFromSignals,
  updateCountryRegions,
  shouldShowSubnationalError
} from '@shared/utils/geographic-scope.util';
import { TextareaComponent } from '@shared/components/custom-fields/textarea/textarea.component';

@Component({
  selector: 'app-geographic-scope',
  imports: [FormHeaderComponent, NavigationButtonsComponent, RadioButtonComponent, MultiselectComponent, MultiselectInstanceComponent, TextareaComponent],
  templateUrl: './geographic-scope.component.html'
})
export default class GeographicScopeComponent {
  environment = environment;
  bodyTest = signal({ value: null, valueMulti: null });
  api = inject(ApiService);
  router = inject(Router);
  body: WritableSignal<GetGeoLocation> = signal({});
  cache = inject(CacheService);
  actions = inject(ActionsService);
  loading = signal(false);
  submission = inject(SubmissionService);
  versionWatcher = inject(VersionWatcherService);
  route = inject(ActivatedRoute);

  private isFirstSelect = true;
  @ViewChildren(MultiselectInstanceComponent) multiselectInstances!: QueryList<MultiselectInstanceComponent>;

  constructor() {
    this.versionWatcher.onVersionChange(() => {
      this.getData();
    });
  }

  onSelect = () => {
    this.body.update(current => {
      mapCountriesToSubnationalSignals(current.countries);
      syncSubnationalArrayFromSignals(current.countries);
      return current;
    });
    const currentId = Number(this.body().geo_scope_id);

    if (!this.isFirstSelect && currentId === 5) {
      this.body.update(value => ({
        ...value,
        countries: []
      }));
      this.isFirstSelect = false;
    }
  };

  canRemove = (): boolean => {
    return this.submission.isEditableStatus();
  };

  isRegionsRequired = computed(() => isRegionsRequiredByScope(Number(this.body().geo_scope_id)));
  isCountriesRequired = computed(() => isCountriesRequiredByScope(Number(this.body().geo_scope_id)));
  isSubNationalRequired = computed(() => isSubNationalRequiredByScope(Number(this.body().geo_scope_id)));
  showSubnationalError = computed(() => shouldShowSubnationalError(Number(this.body().geo_scope_id), this.body().countries));
  getMultiselectLabel = computed(() => getGeoScopeMultiselectTexts(Number(this.body().geo_scope_id)));

  updateCountryRegions = (isoAlpha2: string, newRegions: Region[]) => {
    this.body.update(current => {
      updateCountryRegions(current.countries, isoAlpha2, newRegions);
      return current;
    });
  };

  isArray<T>(value: unknown): value is T[] {
    return Array.isArray(value);
  }

  removeSubnationalRegion(country: Country, region: Region) {
    this.body.update(current => {
      const removedId = removeSubnationalRegionFromCountries(current.countries, country.isoAlpha2, region.sub_national_id);
      const instance = this.multiselectInstances.find(m => m.endpointParams?.isoAlpha2 === country.isoAlpha2);
      if (removedId !== undefined) instance?.removeRegionById(removedId);
      return current;
    });
  }

  async getData() {
    this.loading.set(true);
    const response = await this.api.GET_GeoLocation(this.cache.getCurrentNumericResultId());
    response.data.countries?.forEach(country => {
      country.result_countries_sub_nationals.forEach(subNational => {
        subNational.name = subNational.sub_national?.name ?? '';
      });
    });

    this.body.set(response.data);
    this.body.update(currentBody => {
      mapCountriesToSubnationalSignals(currentBody.countries);
      return currentBody;
    });
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

    if (this.submission.isEditableStatus()) {
      this.body.update(currentBody => {
        syncSubnationalArrayFromSignals(currentBody.countries);
        return currentBody;
      });
      const response = await this.api.PATCH_GeoLocation(numericResultId, this.body());
      if (!response.successfulRequest) {
        this.loading.set(false);
        return;
      }

      await this.getData();

      this.actions.showToast({
        severity: 'success',
        summary: 'Geographic Scope',
        detail: 'Data saved successfully'
      });
    }
    if (page === 'back') {
      navigateTo('partners');
    }
    if (page === 'next') {
      if (this.cache.currentMetadata().indicator_id === 5) {
        navigateTo('links-to-result');
      } else {
        navigateTo('evidence');
      }
    }
   

    this.loading.set(false);
  }
}
