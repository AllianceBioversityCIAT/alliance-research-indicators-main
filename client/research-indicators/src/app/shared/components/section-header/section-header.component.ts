import { Component, inject, OnDestroy, ViewChild, ElementRef, computed, signal, AfterViewInit, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterModule, NavigationEnd } from '@angular/router';
import { CacheService } from '@services/cache/cache.service';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { PopoverModule, Popover } from 'primeng/popover';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '../../services/api.service';
import { SubmissionService } from '../../services/submission.service';
import { GetProjectDetail } from '../../interfaces/get-project-detail.interface';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { DownloadOicrTemplateComponent } from '../download-oicr-template/download-oicr-template.component';
import { RolesService } from '@shared/services/cache/roles.service';
import { isHomeEntryFromUrl, isResultsCenterEntryFromUrl } from '@shared/constants/result-entry-source';
import { WhatsNewService } from '@platform/pages/whats-new/services/whats-new.service';
import { PLATFORM_CODES } from '@shared/constants/platform-codes';
import {
  getStarReportViewerUrl,
  isStarInnDevPdfTemporarilyDisabled,
  isStarPdfReportEligibleFromResultId,
  openStarPdfReportInNewTab
} from '@shared/utils/star-pdf-report.util';

export interface BreadcrumbItem {
  label: string;
  route?: string;
  tooltip?: string;
}

@Component({
  selector: 'app-section-header',
  imports: [CommonModule, PopoverModule, ButtonModule, TooltipModule, MenuModule, RouterModule, DownloadOicrTemplateComponent],
  templateUrl: './section-header.component.html',
  styleUrl: './section-header.component.scss'
})
export class SectionHeaderComponent implements OnDestroy, AfterViewInit, OnInit {
  router = inject(Router);
  cache = inject(CacheService);
  route = inject(ActivatedRoute);
  elementRef = inject(ElementRef);
  actions = inject(ActionsService);
  rolesService = inject(RolesService);
  api = inject(ApiService);
  submissionService = inject(SubmissionService);
  whatsNewService = inject(WhatsNewService);

  private currentProject = signal<GetProjectDetail>({});
  private contractId = signal('');
  private currentUrl = signal('');
  private routerSubscription!: Subscription;
  private currentResult = signal<{ title?: string; project_id?: string }>({});
  private currentResultId = signal('');
  showDeleteOption = computed(() => {
    const statusId = this.cache.currentMetadata()?.status_id;
    return statusId === 5 || statusId === 7 || (statusId === 4 && this.cache.isMyResult()) || this.rolesService.isAdmin();
  });
  showStarPdfReport = computed(() => {
    const resultId = this.cache.currentResultId() || this.currentResultId();
    return isStarPdfReportEligibleFromResultId(this.cache.currentMetadata()?.indicator_id, resultId);
  });
  starPdfReportDisabled = computed(() => isStarInnDevPdfTemporarilyDisabled(this.cache.currentMetadata()?.indicator_id));
  resultTitle = signal('');
  items = computed((): MenuItem[] => {
    const deleteOption: MenuItem = {
      label: 'Delete Result',
      icon: 'pi pi-trash',
      styleClass: 'delete-result',
      command: () => {
        this.actions.showGlobalAlert({
          severity: 'delete',
          summary: 'Are you sure you want to delete this result? ',
          detail: 'Once deleted, it cannot be recovered.',
          confirmCallback: {
            label: 'Delete result',
            event: () => {
              (async () => {
                this.actions.showGlobalAlert({
                  severity: 'processing',
                  summary: 'Processing',
                  detail: 'Deleting result, please wait.',
                  hasNoButton: true,
                  autoHideDuration: 0,
                  hideCloseButton: true
                });

                try {
                  const res = await this.api.DELETE_Result(this.cache.getCurrentNumericResultId());
                  if (res.successfulRequest) {
                    this.actions.hideGlobalAlert(0);
                    this.actions.showToast({ severity: 'success', summary: 'Result deleted', detail: 'Result deleted successfully' });
                    this.router.navigate(['/results-center']);
                  } else {
                    this.actions.hideGlobalAlert(0);
                    this.actions.showGlobalAlert({
                      severity: 'error',
                      summary: 'Error',
                      detail: 'Failed to delete result. Please try again.',
                      confirmCallback: {
                        label: 'OK',
                        event: () => {
                          this.actions.hideGlobalAlert(0);
                        }
                      }
                    });
                  }
                } catch {
                  this.actions.hideGlobalAlert(0);
                  this.actions.showGlobalAlert({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'An error occurred while deleting the result. Please try again.',
                    confirmCallback: {
                      label: 'OK',
                      event: () => {
                        this.actions.hideGlobalAlert(0);
                      }
                    }
                  });
                }
              })();
            }
          }
        });
      }
    };

    const items: MenuItem[] = [
      {
        items: []
      }
    ];

    if (this.showDeleteOption()) {
      items[0].items?.push(deleteOption);
    }
    return items;
  });

  @ViewChild('historyPanel') historyPanel!: Popover;
  private resizeObserver: ResizeObserver | null = null;
  private readonly routeId = signal<string | null>(null);

  ngAfterViewInit(): void {
    const sectionSidebar = this.elementRef.nativeElement.querySelector('#section-sidebar');
    if (sectionSidebar) {
      this.resizeObserver = new ResizeObserver(() => {
        const totalHeight = sectionSidebar.getBoundingClientRect().height;
        this.cache.headerHeight.set(totalHeight);
      });

      this.resizeObserver.observe(sectionSidebar);
    }
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.routerSubscription?.unsubscribe();
  }

  getHistoryItemTitle(item: { title: string; id: string | null }): string {
    return item.id ? `${item.title} (id: ${item.id})` : item.title;
  }

  openStarPdfReport(): void {
    if (this.starPdfReportDisabled()) return;
    const metadata = this.cache.currentMetadata();
    const resultId = this.cache.currentResultId() || this.currentResultId();
    const versionFromUrl = this.route.snapshot.queryParamMap.get('version')?.trim() ?? '';
    const url = getStarReportViewerUrl(
      {
        indicator_id: metadata.indicator_id,
        platform_code: PLATFORM_CODES.STAR,
        result_official_code: metadata.result_official_code
      },
      {
        resultIdFallback: resultId,
        versionOverride: versionFromUrl || null,
        includeVersion: versionFromUrl.length > 0
      }
    );
    openStarPdfReportInNewTab(url);
  }

  welcomeMessage = computed(() => {
    if (this.cache.currentRouteTitle() === 'Home') {
      const userName = this.cache.dataCache().user?.first_name ?? '';
      return `Welcome, ${userName}`;
    }
    return this.cache.currentRouteTitle();
  });

  isProjectDetailPage = computed(() => {
    return this.currentUrl().includes('/project-detail/');
  });

  isResultPage = computed(() => {
    return this.currentUrl().includes('/result/') && this.currentUrl().split('/').length >= 3;
  });

  breadcrumb = computed(() => {
    const project = this.currentProject();
    const contractId = this.contractId();
    const fullUrl = this.currentUrl();

    const homeEntryBreadcrumb = this.breadcrumbForHomeEntry(fullUrl);
    if (homeEntryBreadcrumb) {
      return homeEntryBreadcrumb;
    }

    const resultsCenterEntryBreadcrumb = this.breadcrumbForResultsCenterEntry(fullUrl);
    if (resultsCenterEntryBreadcrumb) {
      return resultsCenterEntryBreadcrumb;
    }

    const whatsNewDetailsBreadcrumb = this.breadcrumbForWhatsNewDetails(fullUrl);
    if (whatsNewDetailsBreadcrumb) {
      return whatsNewDetailsBreadcrumb;
    }

    if (!contractId) return [];

    const enteredFromResultsCenter = isResultsCenterEntryFromUrl(fullUrl);

    const baseItems: BreadcrumbItem[] = [
      {
        label: enteredFromResultsCenter ? 'Results Center' : 'Projects',
        route: enteredFromResultsCenter ? '/results-center' : '/projects'
      },
      {
        label: `Project ${contractId}`,
        tooltip: project?.projectDescription ?? project?.description
      }
    ];

    if (this.isResultPage()) {
      const pathOnly = fullUrl.split(/[?#]/)[0];
      const segs = pathOnly.split('/').filter(Boolean);
      const resultId = segs[0] === 'result' && segs.length >= 2 ? segs[1] : '';

      if (resultId) {
        baseItems[1].route = `/project-detail/${contractId}`;

        baseItems.push({
          label: `Result ${resultId}`,
          tooltip: this.resultTitle()
        });
      }
    }

    return baseItems;
  });

  ngOnInit(): void {
    this.currentUrl.set(this.router.url);

    this.routerSubscription = this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
      this.currentUrl.set(event.url);

      if (this.isProjectDetailPage() || this.isResultPage()) {
        this.loadData();
      } else {
        this.clearData();
      }
    });

    this.loadData();
  }

  private breadcrumbForHomeEntry(fullUrl: string): BreadcrumbItem[] | undefined {
    if (this.isResultPage() && isHomeEntryFromUrl(fullUrl)) {
      const pathOnly = fullUrl.split(/[?#]/)[0];
      const segs = pathOnly.split('/').filter(Boolean);
      const resultId = segs[0] === 'result' && segs.length >= 2 ? segs[1] : '';
      if (resultId) {
        return [
          { label: 'Home', route: '/home' },
          { label: `Result ${resultId}`, tooltip: this.resultTitle() }
        ];
      }
    }
    return undefined;
  }

  private breadcrumbForWhatsNewDetails(fullUrl: string): BreadcrumbItem[] | undefined {
    const pathOnly = fullUrl.split(/[?#]/)[0];
    const segments = pathOnly.split('/').filter(Boolean);
    if (segments[0] !== 'whats-new' || segments[1] !== 'details' || !segments[2]) {
      return undefined;
    }

    const pageId = segments[2];
    const title =
      this.whatsNewService.getActiveReleaseNoteTitle() || this.whatsNewService.getReleaseNoteTitle(this.whatsNewService.findReleaseNoteById(pageId));
    return [
      { label: 'Release Notes', route: '/whats-new' },
      { label: title || 'Release note', tooltip: title || undefined }
    ];
  }

  private breadcrumbForResultsCenterEntry(fullUrl: string): BreadcrumbItem[] | undefined {
    if (this.isResultPage() && isResultsCenterEntryFromUrl(fullUrl)) {
      const pathOnly = fullUrl.split(/[?#]/)[0];
      const segs = pathOnly.split('/').filter(Boolean);
      const resultId = segs[0] === 'result' && segs.length >= 2 ? segs[1] : '';
      if (resultId) {
        return [
          { label: 'Results Center', route: '/results-center' },
          { label: `Result ${resultId}`, tooltip: this.resultTitle() }
        ];
      }
    }
    return undefined;
  }

  private clearData() {
    this.currentProject.set({});
    this.contractId.set('');
    this.currentResult.set({});
    this.currentResultId.set('');
    this.resultTitle.set('');
  }

  private async loadData() {
    if (this.isProjectDetailPage()) {
      await this.loadProjectData();
    } else if (this.isResultPage()) {
      await this.loadResultData();
    }
  }

  private async loadProjectData() {
    const pathOnly = this.router.url.split(/[?#]/)[0];
    const segments = pathOnly.split('/').filter(Boolean);
    const detailIndex = segments.indexOf('project-detail');
    const projectId = detailIndex >= 0 && segments.length > detailIndex + 1 ? segments[detailIndex + 1] : '';
    this.contractId.set(projectId);

    try {
      const response = await this.api.GET_ResultsCount(projectId);
      if (response?.data) {
        this.currentProject.set(response.data);
      }
    } catch (error) {
      console.error('Error loading project data:', error);
    }
  }

  private async loadResultData() {
    const urlParts = this.router.url.split('/');
    const resultId = urlParts[2]; // /result/STAR-2243/any-page -> STAR-2243
    this.currentResultId.set(resultId);

    // Extract numeric ID from platform-prefixed ID (e.g., "STAR-2243" -> 2243)
    const numericId = this.cache.extractNumericId(resultId);

    try {
      const [alignmentsResponse, resultResponse] = await Promise.all([
        this.api.GET_Alignments(numericId),
        this.api.GET_GeneralInformation(numericId)
      ]);

      if (resultResponse?.data?.title) {
        this.resultTitle.set(resultResponse.data.title);
      }

      if (alignmentsResponse?.data?.contracts) {
        const primaryContract = alignmentsResponse.data.contracts.find(
          (contract: { is_primary: boolean; contract_id: string }) => contract.is_primary === true
        );

        if (primaryContract) {
          await this.loadProjectDataById(primaryContract.contract_id);
        }
      }
    } catch (error) {
      console.error('Error loading result data:', error);
    }
  }

  private async loadProjectDataById(projectId: string) {
    this.contractId.set(projectId);

    try {
      const response = await this.api.GET_ResultsCount(projectId);
      if (response?.data) {
        this.currentProject.set(response.data);
      }
    } catch (error) {
      console.error('Error loading project data:', error);
    }
  }
}
