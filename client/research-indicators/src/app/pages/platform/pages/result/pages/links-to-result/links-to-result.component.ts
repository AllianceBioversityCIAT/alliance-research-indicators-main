import { Component, inject, OnDestroy, OnInit, signal, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormHeaderComponent } from '@shared/components/form-header/form-header.component';
import { NavigationButtonsComponent } from '@shared/components/navigation-buttons/navigation-buttons.component';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';
import { CacheService } from '@shared/services/cache/cache.service';
import { SubmissionService } from '@shared/services/submission.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { ApiService } from '@shared/services/api.service';
import { Result } from '@shared/interfaces/result/result.interface';
import { TooltipModule } from 'primeng/tooltip';
import { ActionsService } from '@shared/services/actions.service';
import { LinkResultsResponse } from '@shared/interfaces/link-results.interface';
import { CustomTagComponent } from '@shared/components/custom-tag/custom-tag.component';
import { getIndicatorIcon } from '@shared/constants/indicator-icon.constants';
import { ResultsCenterService } from '@pages/platform/pages/results-center/results-center.service';
import { mapOtherResultLinkPayloadToResult } from '@shared/utils/map-link-other-result-to-result';

const MODAL_INDICATOR_CODES = [1, 2, 3, 4, 6] as const;

@Component({
  selector: 'app-links-to-result',
  imports: [FormHeaderComponent, NavigationButtonsComponent, S3ImageUrlPipe, TooltipModule, CustomTagComponent],
  templateUrl: './links-to-result.component.html'
})
export default class LinksToResultComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly cache = inject(CacheService);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly actions = inject(ActionsService);
  submission = inject(SubmissionService);
  allModalsService = inject(AllModalsService);
  resultsCenterService = inject(ResultsCenterService);
  linkedResults = signal<Result[]>([]);
  originalLinkedResults = signal<Result[]>([]);
  loading = signal(false);
  saving = signal(false);
  private previousModalState = false;

  private readonly modalWatcherCleanup: () => void;

  constructor() {
    effect(() => {
      const isModalOpen = this.allModalsService.modalConfig().selectLinkedResults.isOpen;
      if (this.previousModalState && !isModalOpen) {
        void this.loadLinkedResults();
      }
      this.previousModalState = isModalOpen;
    });
    this.allModalsService.setRefreshLinkedResults(() => this.loadLinkedResults());
    this.modalWatcherCleanup = () => this.allModalsService.setRefreshLinkedResults(undefined);
  }

  ngOnInit(): void {
    void this.loadLinkedResults();
  }

  ngOnDestroy(): void {
    this.modalWatcherCleanup();
  }

  async loadLinkedResults(): Promise<void> {
    this.loading.set(true);
    try {
      const resultId = this.cache.getCurrentNumericResultId();
      const response = await this.api.GET_LinkedResults(resultId);
      const items = response.data?.link_results ?? [];

      if (items.length === 0) {
        this.linkedResults.set([]);
        this.originalLinkedResults.set([]);
        this.allModalsService.syncSelectedResults.set([]);
        return;
      }

      const matched = items
        .map(item => item.other_result)
        .filter((o): o is NonNullable<typeof o> => o != null)
        .map(mapOtherResultLinkPayloadToResult);

      this.linkedResults.set(matched);
      this.originalLinkedResults.set([...matched]);
      this.allModalsService.syncSelectedResults.set(matched);
    } catch (error) {
      console.error('Error loading linked results', error);
      this.linkedResults.set([]);
      this.originalLinkedResults.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  formatResultCode(code: string | number): string {
    if (!code) return String(code || '');
    return String(code).padStart(3, '0');
  }

  getIndicatorIcon(result: Result) {
    return getIndicatorIcon(result.indicators?.icon_src, result.indicator_id);
  }

  removeLinkedResult(resultId: number): void {
    if (!this.submission.isEditableStatus()) return;
    const currentResults = this.linkedResults();
    const updatedResults = currentResults.filter(r => r.result_id !== resultId);
    this.linkedResults.set(updatedResults);
    this.allModalsService.syncSelectedResults.set(updatedResults);
  }

  async saveData(): Promise<void> {
    if (!this.submission.isEditableStatus()) return;

    this.saving.set(true);
    try {
      const currentResults = this.linkedResults();
      const payload: LinkResultsResponse = {
        link_results: currentResults.map(result => ({
          other_result_id: Number(result.result_id)
        }))
      };

      const currentResultId = this.cache.getCurrentNumericResultId();
      await this.api.PATCH_LinkedResults(currentResultId, payload);

      this.actions.showToast({
        severity: 'success',
        summary: 'Linked results',
        detail: 'Data saved successfully'
      });

      this.originalLinkedResults.set([...currentResults]);
      await this.loadLinkedResults();
    } catch (error) {
      this.actions.showToast({
        severity: 'error',
        summary: 'Linked results',
        detail: 'Unable to save changes, please try again'
      });
      console.error(error);
      this.linkedResults.set([...this.originalLinkedResults()]);
    } finally {
      this.saving.set(false);
    }
  }

  async navigate(page?: 'next' | 'back'): Promise<void> {
    const version = this.route.snapshot.queryParamMap.get('version');
    const queryParams = version ? { version } : undefined;

    if (page === 'back') {
      this.router.navigate(['result', this.cache.currentResultId(), 'geographic-scope'], {
        queryParams,
        replaceUrl: true
      });
      return;
    }

    if (page === 'next') {
      await this.saveData();
      this.router.navigate(['result', this.cache.currentResultId(), 'evidence'], {
        queryParams,
        replaceUrl: true
      });
    }
  }

  openSearchLinkedResults(): void {
    this.resultsCenterService.clearAllFiltersWithPreserve([...MODAL_INDICATOR_CODES]);
    this.allModalsService.openModal('selectLinkedResults');
  }
}
