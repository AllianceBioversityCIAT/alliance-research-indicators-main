import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ResultsCenterTableComponent } from '../results-center/components/results-center-table/results-center-table.component';
import { TableFiltersSidebarComponent } from '../results-center/components/table-filters-sidebar/table-filters-sidebar.component';
import { TableConfigurationComponent } from '../results-center/components/table-configuration/table-configuration.component';
import { SectionSidebarComponent } from '@shared/components/section-sidebar/section-sidebar.component';
import { ProjectIndicatorFiltersComponent } from '@shared/components/project-indicator-filters/project-indicator-filters.component';
import { ProjectUtilsService } from '@shared/services/project-utils.service';
import { ApiService } from '../../../../shared/services/api.service';
import { ActivatedRoute, NavigationEnd, PRIMARY_OUTLET, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GetProjectDetail } from '../../../../shared/interfaces/get-project-detail.interface';
import { ResultsCenterService } from '../results-center/results-center.service';
import { RolesService } from '@services/cache/roles.service';
import { BilateralService } from '@shared/services/bilateral.service';
import { filter } from 'rxjs';
import { CustomTagComponent } from '@shared/components/custom-tag/custom-tag.component';
import { GetContractStaffService } from '@shared/services/get-contract-staff.service';
import { GetProjectDetailService } from '@shared/services/get-project-detail.service';
import { ExecutiveOverviewComponent } from './components/executive-overview/executive-overview.component';

interface ViewTab {
  label: string;
  route: string;
}

@Component({
  selector: 'app-project-detail',
  imports: [
    ResultsCenterTableComponent,
    ProjectIndicatorFiltersComponent,
    TableFiltersSidebarComponent,
    TableConfigurationComponent,
    SectionSidebarComponent,
    CustomTagComponent,
    DatePipe,
    RouterOutlet,
    ExecutiveOverviewComponent
  ],
  providers: [GetContractStaffService],
  templateUrl: './project-detail.component.html'
})
export default class ProjectDetailComponent implements OnInit, OnDestroy {
  activatedRoute = inject(ActivatedRoute);
  api = inject(ApiService);
  router = inject(Router);
  resultsCenterService = inject(ResultsCenterService);
  rolesService = inject(RolesService);
  bilateralService = inject(BilateralService);
  readonly contractStaff = inject(GetContractStaffService);
  private readonly projectUtils = inject(ProjectUtilsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly getProjectDetailService = inject(GetProjectDetailService);
  contractId = signal('');
  lastSegment = signal('project-results');
  currentProject = signal<GetProjectDetail | null>(null);
  readonly projectLeverName = computed(() => this.projectUtils.getLeverName(this.currentProject() ?? {}));
  readonly projectGrantAmount = computed(() => formatBudgetAmount(this.currentProject()?.grant_amount));
  readonly projectDivisionLabel = computed(() => formatCodeLabel(this.currentProject()?.divisionId, this.currentProject()?.division));
  readonly projectUnitLabel = computed(() => formatCodeLabel(this.currentProject()?.unitId, this.currentProject()?.unit));
  readonly staffEmpty = computed(() => !this.contractStaff.loading() && !this.contractStaff.loadError() && this.contractStaff.staff().length === 0);

  // Pool Funding flag is sourced from `bilateralService.currentContract`
  // (populated by GET_FindContracts) because the GET_ResultsCount payload
  // that drives `currentProject` does not include `is_pool_funding_contributor`.
  showPoolFundingBadge = computed(() => !!this.bilateralService.currentContract()?.is_pool_funding_contributor);
  canEditPoolFundingTag = computed(() => this.rolesService.canAccessCenterAdmin());
  tabs = computed<ViewTab[]>(() => [
    { label: 'Project Dashboard', route: 'project-dashboard' },
    { label: 'Project Results', route: 'project-results' }
  ]);

  ngOnInit(): void {
    this.contractId.set(this.activatedRoute.snapshot.params['id']);
    if (this.contractId()) {
      this.contractStaff.main(this.contractId());
    }
    this.getLastSegment();

    const hasDrillParams =
      this.activatedRoute.snapshot.queryParamMap?.has('statusTab') ||
      this.activatedRoute.snapshot.queryParamMap?.has('indicatorTab') ||
      this.activatedRoute.snapshot.queryParamMap?.has('leverTab') ||
      this.activatedRoute.snapshot.queryParamMap?.has('contractTab') ||
      this.activatedRoute.snapshot.queryParamMap?.has('yearTab') ||
      this.activatedRoute.snapshot.queryParamMap?.has('resultsTab');

    if (!hasDrillParams && this.lastSegment() === 'project-results' && this.activateProjectResultsState()) {
      void this.resultsCenterService.main();
    }

    this.getProjectDetail();
    // Fetch contract details to source the Pool Funding flag for the header badge.
    void this.bilateralService.getContract(this.contractId());
    this.getLastSegment();
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.getLastSegment());

    this.activatedRoute.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const hasStatusTab = params.has('statusTab');
        const hasIndicatorTab = params.has('indicatorTab');
        const hasLeverTab = params.has('leverTab');
        const hasContractTab = params.has('contractTab');
        const hasYearTab = params.has('yearTab');
        const hasResultsTab = params.has('resultsTab');

        if (!hasStatusTab && !hasIndicatorTab && !hasLeverTab && !hasContractTab && !hasYearTab && !hasResultsTab) {
          return;
        }

        let statusId: number | null | undefined = undefined;
        if (hasStatusTab) {
          const rawStatus = params.get('statusTab');
          if (rawStatus === 'no-status' || rawStatus === 'null' || rawStatus === null) {
            statusId = null;
          } else if (rawStatus !== '') {
            const parsed = Number(rawStatus);
            statusId = Number.isFinite(parsed) ? parsed : null;
          } else {
            statusId = null;
          }
        }

        let indicatorId: number | null | undefined = undefined;
        if (hasIndicatorTab) {
          const rawIndicator = params.get('indicatorTab');
          if (rawIndicator !== null && rawIndicator !== '') {
            const parsed = Number(rawIndicator);
            indicatorId = Number.isFinite(parsed) ? parsed : undefined;
          }
        }

        let leverId: number | null | undefined = undefined;
        if (hasLeverTab) {
          const rawLever = params.get('leverTab');
          if (rawLever !== null && rawLever !== '') {
            const parsed = Number(rawLever);
            leverId = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
          }
        }

        let contractCode: string | null | undefined = undefined;
        if (hasContractTab) {
          const rawContract = params.get('contractTab');
          if (rawContract !== null && rawContract.trim() !== '') {
            contractCode = rawContract.trim();
          }
        }

        let year: number | null | undefined = undefined;
        if (hasYearTab) {
          const rawYear = params.get('yearTab');
          if (rawYear !== null && rawYear !== '') {
            const parsed = Number(rawYear);
            year = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
          }
        }

        this.lastSegment.set('project-results');
        this.resultsCenterService.initializeScopedResultsTable({
          contractId: this.contractId(),
          statusId,
          indicatorId,
          leverId,
          contractCode,
          year
        });

        void this.router.navigate([], {
          relativeTo: this.activatedRoute,
          queryParams: {},
          replaceUrl: true
        });
      });
  }

  getLastSegment(): void {
    const tree = this.router.parseUrl(this.router.url);
    const segments = tree.root.children[PRIMARY_OUTLET]?.segments ?? [];
    const lastPath = segments.at(-1)?.path ?? '';
    this.lastSegment.set(lastPath === this.contractId() || !lastPath ? 'project-results' : lastPath);
  }

  projectTitle(): string {
    return this.projectUtils.getProjectTitle(this.currentProject() ?? {});
  }

  projectStatus(): { statusId: number; statusName: string } {
    return this.projectUtils.getStatusDisplay(this.currentProject() ?? {});
  }

  getContactInitials(name: string): string {
    return getContactInitialsFromName(name);
  }

  onTabClick(tab: ViewTab): void {
    this.lastSegment.set(tab.route);
    if (tab.route === 'project-results') {
      void this.router.navigate(['./'], { relativeTo: this.activatedRoute });
      if (this.activateProjectResultsState()) {
        void this.resultsCenterService.main();
      }
    } else {
      this.resultsCenterService.deactivateStatePersistence(this.getStateKey());
      void this.router.navigate([tab.route], { relativeTo: this.activatedRoute });
    }
  }

  ngOnDestroy(): void {
    const stateKey = this.getStateKey();
    this.resultsCenterService.deactivateStatePersistence(stateKey);
    this.resultsCenterService.showFiltersSidebar.set(false);
    this.resultsCenterService.showConfigurationsSidebar.set(false);
    this.getProjectDetailService.invalidate(this.contractId());
  }

  async getProjectDetail() {
    await this.getProjectDetailService.load(this.contractId());
    this.currentProject.set(this.getProjectDetailService.project());
  }

  onIndicatorClick(indicator: { indicator_id: number; name: string }): void {
    this.resultsCenterService.tableFilters.update(prev => ({
      ...prev,
      indicators: []
    }));

    this.resultsCenterService.tableFilters.update(prev => ({
      ...prev,
      indicators: [{ indicator_id: indicator.indicator_id, name: indicator.name }]
    }));

    this.resultsCenterService.applyFilters();
  }

  private getStateKey(): string {
    return `project-detail:${this.contractId()}`;
  }

  private activateProjectResultsState(): boolean {
    const stateKey = this.getStateKey();
    const restoredState = this.resultsCenterService.restorePersistedState(stateKey);

    this.resultsCenterService.primaryContractId.set(this.contractId());
    this.resultsCenterService.activateStatePersistence(stateKey);

    if (!restoredState || this.isOnlyPendingRevisionStatusFilter()) {
      this.resultsCenterService.resetState();
      return false;
    }

    return true;
  }

  private isOnlyPendingRevisionStatusFilter(): boolean {
    const tableFilters = this.resultsCenterService.tableFilters();
    const resultsFilter = this.resultsCenterService.resultsFilter();
    const appliedFilters = this.resultsCenterService.appliedFilters();

    const hasOnlyPendingRevisionTableFilter =
      tableFilters.statusCodes.length === 1 &&
      tableFilters.statusCodes[0]?.result_status_id === 5 &&
      tableFilters.indicators.length === 0 &&
      tableFilters.contracts.length === 0 &&
      tableFilters.levers.length === 0 &&
      tableFilters.years.length === 0 &&
      (tableFilters.sources?.length ?? 0) === 0;

    return (
      hasOnlyPendingRevisionTableFilter &&
      this.hasOnlyPendingRevisionResultFilter(resultsFilter) &&
      this.hasOnlyPendingRevisionResultFilter(appliedFilters) &&
      this.resultsCenterService.searchInput().trim() === ''
    );
  }

  private hasOnlyPendingRevisionResultFilter(filterState: ReturnType<ResultsCenterService['resultsFilter']>): boolean {
    const statusCodes = filterState['status-codes'] ?? [];
    const indicatorCodes = filterState['indicator-codes'] ?? [];
    const indicatorTabCodes = filterState['indicator-codes-tabs'] ?? [];
    const indicatorFilterCodes = filterState['indicator-codes-filter'] ?? [];
    const contractCodes = filterState['contract-codes'] ?? [];
    const platformCodes = filterState['platform-code'] ?? [];
    const leverCodes = filterState['lever-codes'] ?? [];
    const years = filterState.years ?? [];
    const createUserCodes = filterState['create-user-codes'] ?? [];

    return (
      statusCodes.length === 1 &&
      statusCodes[0] === 5 &&
      indicatorCodes.length === 0 &&
      indicatorTabCodes.length === 0 &&
      indicatorFilterCodes.length === 0 &&
      contractCodes.length === 0 &&
      platformCodes.length === 0 &&
      leverCodes.length === 0 &&
      years.length === 0 &&
      createUserCodes.length === 0
    );
  }
}

function formatBudgetAmount(value: string | number | undefined): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
}

function formatCodeLabel(code: string | undefined, label: string | undefined): string {
  const cleanCode = code?.trim();
  const cleanLabel = label?.trim();
  if (cleanCode && cleanLabel) {
    return `${cleanCode} - ${cleanLabel}`;
  }
  return cleanLabel || cleanCode || '—';
}

function getContactInitialsFromName(name: string): string {
  const parts = name
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }

  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
  }

  return (words[0]?.charAt(0) ?? '?').toUpperCase();
}
