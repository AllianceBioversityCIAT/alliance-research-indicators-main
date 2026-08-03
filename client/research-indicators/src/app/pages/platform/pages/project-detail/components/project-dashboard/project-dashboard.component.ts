import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { GeoScopeCardComponent } from '../geo-scope-card/geo-scope-card.component';
import { ProjectDashboardCardComponent } from '../project-dashboard-card/project-dashboard-card.component';
import { GetTopContributorsContractsService } from '@services/get-top-contributors-contracts.service';
import { GetTopMainContactPersonsService } from '@services/get-top-main-contact-persons.service';
import { GetTopPartnersService } from '@services/get-top-partners.service';
import { GetTopPrimaryLeversService } from '@services/get-top-primary-levers.service';
import { GetGeoScopeService } from '@services/get-geo-scope.service';
import { ApiService } from '@shared/services/api.service';
import { ActionsService } from '@shared/services/actions.service';
import { FileManagerService } from '@shared/services/file-manager.service';
import { DocumentOverviewService } from '@shared/services/document-overview.service';
import { RolesService } from '@shared/services/cache/roles.service';
import {
  DocumentOverviewResponse,
  GroundedProjectDocument,
  mapAvailableOverviewFiles,
  mapOverviewSourceDocuments,
  parseDocumentOverviewParagraphs
} from '@shared/interfaces/document-overview.interface';
import { environment } from '@envs/environment';
import { GetProjectDetail, GetProjectDetailIndicator } from '@shared/interfaces/get-project-detail.interface';
import { ProjectDashboardRankedItem } from '@interfaces/project-dashboard.interface';
import { projectDashboardBarColor } from '@shared/constants/project-dashboard-chart-colors.constants';
import { ProjectUtilsService } from '@shared/services/project-utils.service';
import { ResultsCenterTableComponent } from '../../../results-center/components/results-center-table/results-center-table.component';
import { ResultsCenterService } from '../../../results-center/results-center.service';
import { Result } from '@shared/interfaces/result/result.interface';

const MAX_GROUNDING_DOCS = 3;
const GROUNDING_ACCEPTED_FORMATS = ['.pdf', '.docx', '.txt'];
const GROUNDING_MAX_SIZE_MB = 10;
const GROUNDING_PAGE_LIMIT = 100;

interface ProjectStatusChartItem {
  color: string;
  label: string;
  value: number;
  result_status_id: number;
}

@Component({
  selector: 'app-project-dashboard',
  standalone: true,
  imports: [ButtonModule, ProjectDashboardCardComponent, GeoScopeCardComponent, ResultsCenterTableComponent, DatePipe],
  providers: [
    GetTopContributorsContractsService,
    GetTopMainContactPersonsService,
    GetTopPartnersService,
    GetTopPrimaryLeversService,
    GetGeoScopeService
  ],
  templateUrl: './project-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectDashboardComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly projectUtils = inject(ProjectUtilsService);
  private readonly resultsCenterService = inject(ResultsCenterService);
  private readonly fileManagerService = inject(FileManagerService);
  private readonly documentOverviewService = inject(DocumentOverviewService);
  private readonly rolesService = inject(RolesService);
  private readonly actions = inject(ActionsService);

  readonly maxGroundingDocs = MAX_GROUNDING_DOCS;
  readonly groundingAcceptedFormats = GROUNDING_ACCEPTED_FORMATS;
  readonly groundedDocuments = signal<GroundedProjectDocument[]>([]);
  readonly overviewSourceDocuments = signal<GroundedProjectDocument[]>([]);
  readonly executiveOverviewGeneratedAt = signal<string | null>(null);
  readonly uploadingGroundingDoc = signal(false);
  readonly executiveOverviewParagraphs = signal<string[]>([]);
  readonly executiveOverviewLoading = signal(false);
  readonly executiveOverviewError = signal(false);

  readonly contractId = computed(() => this.route.parent?.snapshot.paramMap.get('id') ?? '');
  readonly project = signal<GetProjectDetail>({});
  readonly canUploadMoreGroundingDocs = computed(() => this.groundedDocuments().length < MAX_GROUNDING_DOCS);
  readonly canGenerateExecutiveOverview = computed(
    () => this.hasGroundedDocuments() && !this.executiveOverviewLoading() && !this.uploadingGroundingDoc()
  );
  readonly groundedDocumentsCountColor = computed(() => {
    const count = this.groundedDocuments().length;
    if (count === 0) return '#8D9299';
    if (count >= MAX_GROUNDING_DOCS) return '#CF0808';
    return '#358540';
  });
  readonly hasGroundedDocuments = computed(() => this.groundedDocuments().length > 0);
  readonly canAccessGroundingSetup = computed(() => this.rolesService.isAdmin());
  readonly hasExecutiveOverviewData = computed(() => this.executiveOverviewParagraphs().length > 0);
  readonly showExecutiveOverview = computed(() => {
    if (this.canAccessGroundingSetup()) {
      return (
        this.hasGroundedDocuments() ||
        this.executiveOverviewLoading() ||
        this.executiveOverviewError() ||
        this.hasExecutiveOverviewData()
      );
    }

    return this.hasExecutiveOverviewData();
  });

  readonly indicatorSummaries = computed(() => {
    const indicators = this.projectUtils.sortIndicators([...(this.project().indicators ?? [])]);
    const ranked = indicators
      .map((indicator, index) => ({
        id: indicator.indicator?.indicator_id ?? indicator.indicator_id ?? index,
        indicatorId: indicator.indicator?.indicator_id ?? indicator.indicator_id ?? null,
        label: formatIndicatorName(indicator),
        value: Number(indicator.count_results ?? 0),
        color: getIndicatorChartColor(indicator, index, indicators.length)
      }))
      .sort((first, second) => second.value - first.value);

    return ranked;
  });

  readonly indicatorsWithResults = computed(() => this.indicatorSummaries().filter(indicator => indicator.value > 0));

  readonly totalProjectResults = computed(() => this.indicatorSummaries().reduce((total, indicator) => total + indicator.value, 0));
  readonly statusChartItems = signal<ProjectStatusChartItem[]>([]);
  readonly statusChartLoading = signal(false);
  readonly statusChartError = signal(false);
  readonly statusBarsMax = computed(() => {
    const items = this.statusChartItems();
    if (!items.length) {
      return 0;
    }
    return Math.max(...items.map(item => item.value), 0);
  });

  readonly topContributors = inject(GetTopContributorsContractsService);
  readonly topMainContactPersons = inject(GetTopMainContactPersonsService);
  readonly topPartners = inject(GetTopPartnersService);
  readonly topPrimaryLevers = inject(GetTopPrimaryLeversService);
  private readonly geoScope = inject(GetGeoScopeService);

  readonly contributorItems = computed(() =>
    this.topContributors
      .list()
      .map((item, index) => ({
        id: item.contract_code ?? item.contract_id ?? String(index),
        label: formatContributorLabel(item),
        count: Number(item.results_count ?? item.count ?? 0)
      }))
      .sort((first, second) => second.count - first.count)
  );

  readonly contributorsEmpty = computed(
    () => !this.topContributors.loading() && !this.topContributors.loadError() && this.topContributors.list().length === 0
  );

  readonly mainContactPersonItems = computed(() =>
    this.topMainContactPersons
      .list()
      .map((item, index) => ({
        id: formatMainContactPersonName(item) ?? String(index),
        label: formatMainContactPersonName(item) ?? '—',
        count: Number(item.results_count ?? item.count ?? item.value ?? 0),
        description: item.email
      }))
      .sort((first, second) => second.count - first.count)
  );

  readonly mainContactPersonsEmpty = computed(
    () =>
      !this.topMainContactPersons.loading() &&
      !this.topMainContactPersons.loadError() &&
      this.topMainContactPersons.list().length === 0
  );

  readonly partnerItems = computed(() =>
    this.topPartners.list().map((item, index) => ({
      id: getPartnerItemId(item, index),
      label: formatPartnerLabel(item),
      count: Number(item.results_count ?? item.count ?? 0)
    }))
  );

  readonly partnersEmpty = computed(() => !this.topPartners.loading() && !this.topPartners.loadError() && this.topPartners.list().length === 0);

  readonly leverItems = computed(() =>
    this.topPrimaryLevers
      .list()
      .map(item => ({
        id: String(item.lever_id),
        label: formatLeverDisplayLabel(item.short_name, item.full_name),
        count: item.count,
        iconUrl: item.icon || undefined
      }))
      .sort((first, second) => second.count - first.count)
  );

  readonly leversEmpty = computed(
    () => !this.topPrimaryLevers.loading() && !this.topPrimaryLevers.loadError() && this.topPrimaryLevers.list().length === 0
  );

  readonly pendingRevisionExcludedColumns = ['status', 'year', 'versions', 'creation_date', 'public_link', 'project'] as const;

  constructor() {
    effect(() => {
      const contractId = this.contractId();
      if (contractId) {
        void this.loadProject(contractId);
        void this.loadProjectResultsByStatus(contractId);
        this.topContributors.main(contractId, 4);
        this.topMainContactPersons.main(contractId, 4);
        this.topPartners.main(contractId, 4);
        this.topPrimaryLevers.main(contractId, 4);
        this.geoScope.main(contractId);
        this.resultsCenterService.initializeProjectDashboardResultsTable(contractId);

        void this.loadExecutiveOverviewSummary();
      }
    });
  }

  private async loadProject(contractId: string): Promise<void> {
    const response = await this.api.GET_ResultsCount(contractId);
    if (response?.data) {
      this.project.set(response.data);
    } else {
      this.project.set({});
    }
  }

  indicatorSharePercent(value: number): number {
    const total = this.totalProjectResults();
    if (total <= 0 || value <= 0) {
      return 0;
    }

    return Math.round((value / total) * 100);
  }

  statusBarFillPercent(value: number): number {
    const max = this.statusBarsMax();
    if (max <= 0) {
      return 0;
    }
    return Math.min(100, (value / max) * 100);
  }

  triggerGroundingUpload(fileInput: HTMLInputElement): void {
    if (!this.canAccessGroundingSetup() || !this.canUploadMoreGroundingDocs() || this.uploadingGroundingDoc()) {
      return;
    }

    fileInput.value = '';
    fileInput.click();
  }

  async onGroundingFilesSelected(event: Event): Promise<void> {
    if (!this.canAccessGroundingSetup()) {
      return;
    }

    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    if (!files.length) {
      return;
    }

    const remainingSlots = MAX_GROUNDING_DOCS - this.groundedDocuments().length;
    if (remainingSlots <= 0) {
      this.actions.showToast({
        severity: 'warning',
        summary: 'Upload limit reached',
        detail: `You can upload up to ${MAX_GROUNDING_DOCS} foundational documents.`
      });
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      this.actions.showToast({
        severity: 'info',
        summary: 'Upload limit',
        detail: `Only ${remainingSlots} more document${remainingSlots === 1 ? '' : 's'} can be uploaded.`
      });
    }

    this.uploadingGroundingDoc.set(true);

    try {
      for (const file of filesToUpload) {
        if (!this.isValidGroundingFile(file)) {
          continue;
        }

        const response = await this.fileManagerService.uploadFile(file, GROUNDING_MAX_SIZE_MB, GROUNDING_PAGE_LIMIT, {
          projectId: this.contractId()
        });
        const storedFilename = response.data.filename;

        if (!storedFilename) {
          throw new Error('Could not get the name of the uploaded file.');
        }

        this.groundedDocuments.update(current => [
          ...current,
          {
            fileName: file.name,
            fileKey: `${environment.keyProjectOverview}${this.contractId()}/${storedFilename}`
          }
        ]);
      }
    } catch {
      this.actions.showToast({
        severity: 'error',
        summary: 'Upload failed',
        detail: 'Something went wrong while uploading the document. Please try again.'
      });
    } finally {
      this.uploadingGroundingDoc.set(false);
    }
  }

  private isValidGroundingFile(file: File): boolean {
    const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
    if (!GROUNDING_ACCEPTED_FORMATS.includes(extension)) {
      this.actions.showToast({
        severity: 'warning',
        summary: 'Unsupported file',
        detail: `Accepted formats: ${GROUNDING_ACCEPTED_FORMATS.join(', ')}.`
      });
      return false;
    }

    const maxBytes = GROUNDING_MAX_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      this.actions.showToast({
        severity: 'warning',
        summary: 'File too large',
        detail: `Each document can be up to ${GROUNDING_MAX_SIZE_MB} MB.`
      });
      return false;
    }

    return true;
  }

  removeGroundingDocument(fileKey: string): void {
    if (!this.canAccessGroundingSetup()) {
      return;
    }

    const document = this.groundedDocuments().find(item => item.fileKey === fileKey);
    if (!document) {
      return;
    }

    this.actions.showGlobalAlert({
      severity: 'warning',
      summary: 'Remove document',
      icon: 'pi pi-exclamation-triangle',
      color: '#E69F00',
      detail:
        'Removing this document may make the current Executive Overview outdated. ' +
        'We recommend regenerating it to update the grounded summary.',
      confirmCallback: {
        label: 'Continue',
        event: () => {
          void this.removeGroundingDocumentAsync(fileKey);
        }
      },
      cancelCallback: {
        label: 'Cancel'
      },
      buttonColor: '#035BA9'
    });
  }

  private async removeGroundingDocumentAsync(fileKey: string): Promise<void> {
    const projectId = this.contractId();
    if (!projectId) {
      return;
    }

    const document = this.groundedDocuments().find(item => item.fileKey === fileKey);
    if (!document) {
      return;
    }

    try {
      await this.documentOverviewService.deleteDocumentOverviewFiles(projectId, [document.fileName]);
      this.groundedDocuments.update(current => current.filter(item => item.fileKey !== fileKey));
    } catch {
      this.actions.showToast({
        severity: 'error',
        summary: 'Remove failed',
        detail: 'Something went wrong while removing the document. Please try again.'
      });
    }
  }

  async generateExecutiveOverview(): Promise<void> {
    if (!this.canAccessGroundingSetup() || !this.hasGroundedDocuments()) {
      return;
    }

    const projectId = this.contractId();
    if (!projectId) {
      return;
    }

    this.executiveOverviewLoading.set(true);
    this.executiveOverviewError.set(false);

    try {
      const response = await this.documentOverviewService.generateDocumentOverview(projectId);
      this.applyDocumentOverviewResponse(response);
    } catch {
      this.executiveOverviewError.set(true);
    } finally {
      this.executiveOverviewLoading.set(false);
    }
  }

  private async loadExecutiveOverviewSummary(): Promise<void> {
    const projectId = this.contractId();
    if (!projectId) {
      return;
    }

    this.executiveOverviewLoading.set(true);
    this.executiveOverviewError.set(false);

    try {
      const response = await this.documentOverviewService.fetchDocumentOverviewSummary(projectId);
      this.applyDocumentOverviewResponse(response);
    } catch {
      this.clearGeneratedExecutiveOverview();
      this.groundedDocuments.set([]);
    } finally {
      this.executiveOverviewLoading.set(false);
    }
  }

  private applyDocumentOverviewResponse(response: DocumentOverviewResponse): void {
    this.executiveOverviewParagraphs.set(parseDocumentOverviewParagraphs(response));
    this.groundedDocuments.set(mapAvailableOverviewFiles(response));
    this.overviewSourceDocuments.set(mapOverviewSourceDocuments(response));
    this.executiveOverviewGeneratedAt.set(response.generated_at ?? null);
  }

  private clearGeneratedExecutiveOverview(): void {
    this.executiveOverviewParagraphs.set([]);
    this.overviewSourceDocuments.set([]);
    this.executiveOverviewGeneratedAt.set(null);
  }

  private async loadProjectResultsByStatus(contractId: string): Promise<void> {
    this.statusChartLoading.set(true);
    this.statusChartError.set(false);

    try {
      const response = await this.api.GET_Results(
        { 'contract-codes': [contractId] },
        undefined,
        { page: 1, limit: 10_000, sortField: 'code', sortOrder: 'DESC' }
      );
      this.statusChartItems.set(buildStatusChartItems(response?.data?.results ?? []));
    } catch {
      this.statusChartItems.set([]);
      this.statusChartError.set(true);
    } finally {
      this.statusChartLoading.set(false);
    }
  }
}

function formatLeverDisplayLabel(shortName: string, fullName: string): string {
  const colonIndex = fullName.indexOf(':');
  if (colonIndex >= 0) {
    const prefix = fullName.slice(0, colonIndex).trim() || shortName;
    const suffix = fullName.slice(colonIndex + 1).trim();
    return suffix ? `${prefix} - ${suffix}`.toUpperCase() : prefix.toUpperCase();
  }

  return (fullName || shortName || '—').toUpperCase();
}

function formatMainContactPersonName(item: ProjectDashboardRankedItem): string | undefined {
  const firstLastName = [item.first_name, item.last_name].filter(Boolean).join(' ').trim();
  return item.name ?? item.full_name ?? item.contact_person_name ?? item.label ?? (firstLastName || undefined);
}

function formatContributorLabel(item: ProjectDashboardRankedItem): string {
  const contractId = item.contract_id ?? item.contract_code;
  const label = item.contract_description ?? item.project_name;
  if (contractId && label) {
    return `${contractId} - ${label}`;
  }
  return label ?? contractId ?? '—';
}

function formatPartnerLabel(item: ProjectDashboardRankedItem): string {
  const name = item.institution_name ?? item.partner_name ?? '—';
  const acronym = item.acronym?.trim();
  return acronym && name !== '—' ? `${acronym} - ${name}` : name;
}

function buildStatusChartItems(results: Result[]): ProjectStatusChartItem[] {
  const statuses = new Map<number, ProjectStatusChartItem>();

  for (const result of results) {
    const status = result.result_status;
    const statusId = Number(status?.result_status_id);
    if (!Number.isFinite(statusId)) {
      continue;
    }

    const current = statuses.get(statusId);
    if (current) {
      current.value += 1;
      continue;
    }

    statuses.set(statusId, {
      color: status?.config?.color?.text || '#1689CA',
      label: status?.name || 'Unknown status',
      value: 1,
      result_status_id: statusId
    });
  }

  return [...statuses.values()].sort((first, second) => second.value - first.value);
}

function getPartnerItemId(item: ProjectDashboardRankedItem, index: number): string {
  if (item.institution_id === null || item.institution_id === undefined) {
    return item.partner_name ?? String(index);
  }

  return String(item.institution_id);
}

function formatIndicatorName(indicator: GetProjectDetailIndicator): string {
  return indicator.indicator?.name ?? indicator.full_name ?? 'Indicator';
}

function getIndicatorChartColor(indicator: GetProjectDetailIndicator, fallbackIndex: number, totalIndicators: number): string {
  const indicatorId = indicator.indicator?.indicator_id ?? indicator.indicator_id;
  const colorsByIndicatorId: Record<number, string> = {
    1: '#1689CA',
    2: '#7CB580',
    3: '#78288c',
    4: '#CF0808',
    5: '#F58220',
    6: '#173f6f'
  };

  return typeof indicatorId === 'number'
    ? (colorsByIndicatorId[indicatorId] ?? projectDashboardBarColor(fallbackIndex, totalIndicators))
    : projectDashboardBarColor(fallbackIndex, totalIndicators);
}

