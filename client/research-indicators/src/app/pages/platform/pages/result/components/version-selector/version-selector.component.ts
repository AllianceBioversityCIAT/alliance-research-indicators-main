import { Component, effect, inject, signal, OnDestroy, EffectRef } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { TransformResultCodeResponse } from '@shared/interfaces/get-transform-result-code.interface';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { GetMetadataService } from '@shared/services/get-metadata.service';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { filter, Subscription } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { PLATFORM_CODES } from '@shared/constants/platform-codes';
import {
  RESULT_ENTRY_SOURCE_QUERY,
  RESULT_ENTRY_SOURCE_VALUE_HOME,
  RESULT_ENTRY_SOURCE_VALUE_RESULTS_CENTER
} from '@shared/constants/result-entry-source';

@Component({
  selector: 'app-version-selector',
  standalone: true,
  templateUrl: './version-selector.component.html',
  imports: [DividerModule, TooltipModule]
})
export class VersionSelectorComponent implements OnDestroy {
  readonly cache = inject(CacheService);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly actions = inject(ActionsService);
  private readonly metadata = inject(GetMetadataService);

  selectedResultId = signal<number | null>(null);
  liveVersion = signal<TransformResultCodeResponse | null>(null);
  approvedVersions = signal<TransformResultCodeResponse[]>([]);

  prmsUrl: string = environment.prmsUrl;
  tipUrl: string = environment.tipUrl;

  private readonly versionEffectCleanup: EffectRef | undefined;
  private readonly routerEventsSub: Subscription | undefined;
  private hasAutoNavigated = false;

  constructor() {
    this.routerEventsSub = this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      this.loadVersions();
    });

    this.versionEffectCleanup = effect(() => {
      this.loadVersions();
    });
  }

  ngOnDestroy() {
    if (this.versionEffectCleanup && typeof this.versionEffectCleanup.destroy === 'function') {
      this.versionEffectCleanup.destroy();
    }
    if (this.routerEventsSub) {
      this.routerEventsSub.unsubscribe();
    }
  }

  private async loadVersions() {
    const currentResultId = this.cache.currentResultId();
    const numericResultId = this.cache.extractNumericId(currentResultId);
    if (!numericResultId || numericResultId <= 0) return;

    const versionParam = this.route.snapshot.queryParamMap.get('version');

    if (this.cache.lastResultId() === numericResultId && this.cache.lastVersionParam() === versionParam) {
      this.applyCachedVersions(numericResultId, versionParam);
      return;
    }

    this.cache.lastResultId.set(numericResultId);
    this.cache.lastVersionParam.set(versionParam);

    const response = await this.api.GET_Versions(numericResultId);
    const data = response.data;

    const liveData = Array.isArray(data.live) && data.live.length > 0 ? data.live[0] : null;
    const versionsArray = this.getVersionsArray(data);

    this.cache.liveVersionData.set(liveData);
    this.cache.versionsList.set(versionsArray);

    this.liveVersion.set(liveData);
    this.approvedVersions.set(versionsArray);

    this.handleVersionSelection({ currentResultId: currentResultId.toString(), liveData, versionsArray });
  }

  protected getVersionsArray(data: { versions?: unknown }): TransformResultCodeResponse[] {
    return Array.isArray(data.versions) ? (data.versions as TransformResultCodeResponse[]) : [];
  }

  private applyCachedVersions(resultId: number, versionParam: string | null) {
    this.liveVersion.set(this.cache.liveVersionData());
    this.approvedVersions.set(this.cache.versionsList());

    if (versionParam) {
      const selected = this.cache.versionsList().find(v => String(v.report_year_id) === versionParam);
      if (selected) {
        this.selectedResultId.set(selected.result_id);
      }
    } else {
      const live = this.cache.liveVersionData();
      if (live && live.result_status_id !== 6) {
        this.selectedResultId.set(live.result_id);
      } else {
        const firstApproved = this.cache.versionsList()[0];
        if (firstApproved) {
          this.selectedResultId.set(firstApproved.result_id);
        }
      }
    }
  }

  private handleVersionSelection({
    currentResultId,
    liveData,
    versionsArray
  }: {
    currentResultId: string;
    liveData: TransformResultCodeResponse | null;
    versionsArray: TransformResultCodeResponse[];
  }) {
    const versionParam = this.route.snapshot.queryParamMap.get('version');
    const urlParts = this.router.url.split('/');
    const currentChild = urlParts.length > 3 ? urlParts[3].split('?')[0] : 'general-information';

    if (versionParam) {
      const selectedVersion = versionsArray.find(v => String(v.report_year_id) === versionParam);
      if (selectedVersion && this.selectedResultId() !== selectedVersion.result_id) {
        this.selectedResultId.set(selectedVersion.result_id);
      }
      return;
    }

    if (!versionParam && liveData && liveData.result_status_id !== 6) {
      if (this.selectedResultId() !== liveData.result_id) {
        this.selectedResultId.set(liveData.result_id);
      }
      if (currentChild === 'general-information') {
        this.router.navigate(['/result', currentResultId, currentChild], {
          queryParams: { ...this.entrySourceQueryParamRecord(), version: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
      }
      return;
    }

    if (!versionParam && !liveData && versionsArray.length > 0 && !this.hasAutoNavigated) {
      const firstApproved = versionsArray[0];
      this.selectedResultId.set(firstApproved.result_id);
      if (currentChild === 'general-information') {
        this.router.navigate(['/result', currentResultId, currentChild], {
          queryParams: { ...this.entrySourceQueryParamRecord(), version: firstApproved.report_year_id },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
        this.hasAutoNavigated = true;
      }
    }
  }

  selectVersion(version: TransformResultCodeResponse) {
    this.selectedResultId.set(version.result_id);
    const isLive = this.liveVersion()?.result_id === version.result_id;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: isLive
        ? { version: null, ...this.entrySourceQueryParamRecord() }
        : { version: String(version.report_year_id), ...this.entrySourceQueryParamRecord() },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  isSelected(version: TransformResultCodeResponse) {
    return this.selectedResultId() === version.result_id;
  }

  get hasLiveVersion() {
    return this.liveVersion() !== null && this.liveVersion()?.result_status_id !== 6;
  }

  get liveVersionData(): TransformResultCodeResponse {
    return this.liveVersion()!;
  }

  updateResult() {
    this.actions.showGlobalAlert({
      severity: 'confirm',
      summary: 'CONFIRM UPDATING',
      detail: 'Please confirm the reporting year associated with this update:',
      selectorLabel: 'Reporting year',
      serviceName: 'getYearsByCode',
      selectorRequired: true,
      confirmCallback: {
        label: 'Confirm',
        event: (data?: { comment?: string; selected?: string }) => {
          (async () => {
            const response = await this.api.PATCH_ReportingCycle(this.cache.getCurrentNumericResultId(), data?.selected ?? '');

            if (!response.successfulRequest) {
              this.actions.showToast({ severity: 'error', summary: 'Error', detail: response.errorDetail.errors });
            } else {
              // clear the cache to force a complete reload
              this.cache.lastResultId.set(null);
              this.cache.lastVersionParam.set(null);
              this.cache.liveVersionData.set(null);
              this.cache.versionsList.set([]);

              // Force metadata update
              this.metadata.update(this.cache.getCurrentNumericResultId());

              // Navigate to the current route without parameters to stay in live version
              const currentPath = this.router.url.split('?')[0];
              this.router
                .navigate([currentPath], {
                  queryParams: { version: null, ...this.entrySourceQueryParamRecord() },
                  queryParamsHandling: 'merge',
                  replaceUrl: true
                })
                .then(() => {
                  // After navigating, reload the versions
                  this.loadVersions();
                });

              this.actions.showGlobalAlert({
                severity: 'success',
                hasNoButton: true,
                summary: 'RESULT UPDATED',
                detail: 'The result was updated successfully.'
              });
            }
          })();
        }
      },
      buttonColor: '#035BA9'
    });
  }

  editInPlatform() {
    const platformCode = this.cache.getCurrentPlatformCode();
    let url = '';
    
    if (platformCode === PLATFORM_CODES.PRMS) {
      url = this.prmsUrl;
    } else if (platformCode === PLATFORM_CODES.TIP) {
      url = this.tipUrl;
    }
    
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  get platformEditButtonText(): string {
    const platformCode = this.cache.getCurrentPlatformCode();
    return `Edit in ${platformCode}`;
  }

  private isResultRouteActive(resultId: string | number): boolean {
    // Verify that the current URL contains /result/{id}
    return this.router.url.startsWith(`/result/${resultId}`);
  }

  private entrySourceQueryParamRecord(): { [RESULT_ENTRY_SOURCE_QUERY]?: string } {
    const from = this.route.snapshot.queryParamMap.get(RESULT_ENTRY_SOURCE_QUERY);
    if (from === RESULT_ENTRY_SOURCE_VALUE_RESULTS_CENTER || from === RESULT_ENTRY_SOURCE_VALUE_HOME) {
      return { [RESULT_ENTRY_SOURCE_QUERY]: from };
    }
    return {};
  }
}
