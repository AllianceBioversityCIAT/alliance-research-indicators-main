import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { ApiService } from '@shared/services/api.service';
import { RouterLink } from '@angular/router';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { GreenChecks } from '@shared/interfaces/get-green-checks.interface';
import { FormatDatePipe } from '@shared/pipes/format-date.pipe';
import { DateFormatConfigService } from '@shared/services/date-format-config.service';
import { CustomTagComponent } from '@shared/components/custom-tag/custom-tag.component';
import { STATUS_COLOR_MAP } from '@shared/constants/status-colors';
import { PLATFORM_CODES } from '@shared/constants/platform-codes';
import { Result, ResultFilter } from '@shared/interfaces/result/result.interface';
import { normalizeSnapshotYears } from '@shared/interfaces/result/map-v2-result-list-item';
import { RESULT_ENTRY_SOURCE_QUERY, RESULT_ENTRY_SOURCE_VALUE_HOME } from '@shared/constants/result-entry-source';
import { CacheService } from '@shared/services/cache/cache.service';

@Component({
  selector: 'app-my-latest-results',
  imports: [FormatDatePipe, CustomTagComponent, RouterLink],
  templateUrl: './my-latest-results.component.html',
  styleUrl: './my-latest-results.component.scss'
})
export class MyLatestResultsComponent implements OnInit {
  api = inject(ApiService);
  allModalsService = inject(AllModalsService);
  cache = inject(CacheService);
  dateFormatConfig = inject(DateFormatConfigService);
  greenChecksByResult: WritableSignal<Record<string, GreenChecks>> = signal({});

  latestResultList: WritableSignal<Result[]> = signal([]);

  ngOnInit() {
    this.loadLatestResultsWithGreenChecks();
  }

  async loadLatestResultsWithGreenChecks() {
    const userId = this.cache.dataCache().user?.sec_user_id;
    if (userId == null) {
      this.latestResultList.set([]);
      this.greenChecksByResult.set({});
      return;
    }

    const filter: ResultFilter = {
      'indicator-codes': [],
      'lever-codes': [],
      'create-user-codes': [String(userId)]
    };

    const response = await this.api.GET_Results(filter, undefined, {
      page: 1,
      limit: 3,
      sortOrder: 'DESC',
      sortField: 'last-updated'
    });

    const results = response.data?.results ?? [];
    this.latestResultList.set(results);

    this.greenChecksByResult.set({});
    for (const result of results) {
      const resultCode = `${result.platform_code}-${result.result_official_code}`;
      const officialNum = Number.parseInt(String(result.result_official_code), 10);
      if (!Number.isFinite(officialNum)) continue;
      const { data } = await this.api.GET_GreenChecks(officialNum, result.platform_code);
      this.greenChecksByResult.update(map => ({
        ...map,
        [resultCode]: data
      }));
    }
  }

  /** Same effective text color as `app-custom-tag` uses for the status label (for progress bar fill). */
  getStatusProgressColor(result: Result): string {
    const fromConfig = result.result_status?.config?.color?.text?.trim();
    if (fromConfig) return fromConfig;
    const id = String(result.result_status?.result_status_id ?? '');
    return STATUS_COLOR_MAP[id]?.text ?? STATUS_COLOR_MAP[''].text;
  }

  calculateProgressFor(result: Result): number {
    if (!result) return 0;
    const resultCode = `${result.platform_code}-${result.result_official_code}`;
    const greenChecks = this.greenChecksByResult()[resultCode];
    if (!greenChecks) return 0;

    if (greenChecks.completness === 1) {
      return 100;
    }

    const indicatorId = result.indicator_id;
    const steps = this.getSteps(indicatorId);

    const stepsToUse = steps.filter(key => key !== 'completness');
    const total = stepsToUse.length;
    const completed = stepsToUse.filter(key => greenChecks[key] === 1).length;

    return total === 0 ? 0 : Math.round((completed / total) * 100);
  }

  protected getSteps(indicatorId: number): (keyof GreenChecks)[] {
    return [
      'general_information',
      'alignment',
      ...(indicatorId === 1 ? (['cap_sharing', 'cap_sharing_ip'] as (keyof GreenChecks)[]) : []),
      ...(indicatorId === 4 ? (['policy_change'] as (keyof GreenChecks)[]) : []),
      ...(indicatorId === 5 ? (['link_result', 'oicr'] as (keyof GreenChecks)[]) : []),
      ...(indicatorId === 2 ? (['innovation_dev'] as (keyof GreenChecks)[]) : []),
      'partners',
      'geo_location',
      'evidences',
      indicatorId === 1 || indicatorId === 2 ? 'ip_rights' : []
    ] as (keyof GreenChecks)[];
  }

  truncateTitle(title: string | null | undefined): string {
    const text = (title ?? '').trim();
    if (text === '') return '';
    const words = text.split(/\s+/);
    if (words.length <= 30) return text;
    return words.slice(0, 30).join(' ') + '...';
  }

  lastUpdatedAt(result: Result): string | undefined {
    const u = result.updated_at?.trim();
    if (u) return u;
    return result.created_at?.trim() || undefined;
  }

  /** PRMS / TIP / AICCRA open the result information modal instead of in-app routing. */
  opensResultInformationModal(result: Result): boolean {
    const platform = result.platform_code;
    return platform === PLATFORM_CODES.PRMS || platform === PLATFORM_CODES.TIP || platform === PLATFORM_CODES.AICCRA;
  }

  getStarResultRouterLink(result: Result): string[] {
    const resultCode = `${result.platform_code}-${result.result_official_code}`;
    const snapshotYears = normalizeSnapshotYears(result.snapshot_years);
    if (result.result_status?.result_status_id === 6 && snapshotYears.length > 0) {
      return ['/result', resultCode, 'general-information'];
    }
    return ['/result', resultCode];
  }

  getStarResultQueryParams(result: Result): Record<string, string | number> {
    const fromHome = { [RESULT_ENTRY_SOURCE_QUERY]: RESULT_ENTRY_SOURCE_VALUE_HOME };
    const snapshotYears = normalizeSnapshotYears(result.snapshot_years);
    if (result.result_status?.result_status_id === 6 && snapshotYears.length > 0) {
      return { version: Math.max(...snapshotYears), ...fromHome };
    }
    return fromHome;
  }

  onResultCardClick(result: Result, event: Event): void {
    if (this.isInteractionOnMoreMenu(event)) {
      event.preventDefault();
      return;
    }
    if (this.opensResultInformationModal(result)) {
      event.preventDefault();
      this.openResultInformationModal(result);
      return;
    }
    this.closeResultInformationModalIfOpen();
  }

  private isInteractionOnMoreMenu(event: Event): boolean {
    const target = event.target;
    if (!(target instanceof Node)) {
      return false;
    }
    const el = target instanceof Element ? target : target.parentElement;
    return Boolean(el?.closest('.more-vert'));
  }

  private openResultInformationModal(result: Result): void {
    this.allModalsService.selectedResultForInfo.set(result);
    this.allModalsService.setResultInformationEntryContext(null);
    this.allModalsService.openModal('resultInformation');
  }

  private closeResultInformationModalIfOpen(): void {
    if (this.allModalsService.isModalOpen('resultInformation').isOpen) {
      this.allModalsService.closeModal('resultInformation');
    } else {
      this.allModalsService.setResultInformationEntryContext(null);
    }
    this.allModalsService.selectedResultForInfo.set(null);
  }
}
