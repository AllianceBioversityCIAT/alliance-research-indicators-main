import { Component, DebugElement, EventEmitter, Input, Output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { By } from '@angular/platform-browser';
import { ApiService } from '@shared/services/api.service';
import { ProjectUtilsService } from '@shared/services/project-utils.service';
import { ResultsCenterService } from '../../../results-center/results-center.service';
import { GetResultsService } from '@shared/services/control-list/get-results.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { GetGeoScopeService } from '@shared/services/get-geo-scope.service';
import { GetFullContractReportsService } from '@services/get-full-contract-reports.service';
import { FileManagerService } from '@shared/services/file-manager.service';
import { DocumentOverviewService } from '@shared/services/document-overview.service';
import { RolesService } from '@shared/services/cache/roles.service';
import { ActionsService } from '@shared/services/actions.service';
import { ChartKey, ProjectDashboardComponent } from './project-dashboard.component';
import { GeoScopeCardComponent } from '../geo-scope-card/geo-scope-card.component';
import { COLLAPSED_ITEM_LIMIT, ProjectDashboardCardComponent } from '../project-dashboard-card/project-dashboard-card.component';
import { ResultsCenterTableComponent } from '../../../results-center/components/results-center-table/results-center-table.component';
import { ContractFullReports, IndicatorMetadataCount } from '@interfaces/contract-full-reports.interface';
import { mockContractFullReports } from 'src/app/testing/contract-full-reports.mock';
import { IndicatorMetadataBandComponent } from './indicator-metadata-band.component';
import { UNLABELLED_CATEGORY_FALLBACK } from './indicator-metadata-bands.mapper';
import { AllModalsService } from '@shared/services/cache/all-modals.service';

jest.mock('mapbox-gl', () => ({}), { virtual: true });

/**
 * T-07 (design.md §10 / tasks.md §3). This stub is legitimate ONLY for
 * input/output assertions on the host↔card seam (DC-11) — anything that
 * renders *inside* the real card is T-04's spec, already gated against the
 * real template. It must declare every `@Input()`/`@Output()` the production
 * template binds, including `visibleLimit` and `expandToggled` added by
 * T-02/T-03/T-06 and `retry` (bound on all four cards in
 * project-dashboard.component.html as `(retry)="reports.update()"`) —
 * otherwise the assertions below read back only this class's own defaults,
 * not what the host actually passed down (KZ-001).
 */
@Component({
  selector: 'app-project-dashboard-card',
  standalone: true,
  template: ''
})
class ProjectDashboardCardStubComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() compact = false;
  @Input() loading = false;
  @Input() error = false;
  @Input() empty = false;
  @Input() emptyMessage = '';
  @Input() items: unknown[] = [];
  @Input() layout = '';
  @Input() itemHeightPx: number | null = null;
  @Input() iconClass = '';
  @Input() visibleLimit: number | null = null;
  @Output() expandToggled = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();
}

@Component({
  selector: 'app-geo-scope-card',
  standalone: true,
  template: ''
})
class GeoScopeCardStubComponent { }

@Component({
  selector: 'app-results-center-table',
  standalone: true,
  template: ''
})
class ResultsCenterTableStubComponent {
  @Input() hideFiltersToolbar = false;
  @Input() roundedBottom = false;
  @Input() excludedColumnFields: readonly string[] = [];
  @Input() emptyMessage = '';
}

/**
 * T-14: the four real band-indicator ids (`indicator-metadata-bands.mapper.ts`
 * `BAND_DEFINITIONS`), shaped exactly like the default `GET_ResultsCount`
 * fixture's `indicators` entries (`{ indicator: { indicator_id, name },
 * count_results }`) so `setup(..., { indicators: [...] })` can seed a real
 * band. Ids verified against the mapper's own citations, not guessed:
 * Capacity Sharing 1, Innovation Development 2, Policy Change 4, OICR 5.
 */
const BAND_INDICATOR_FIXTURES = {
  innovationDevelopment: { indicator: { indicator_id: 2, name: 'Innovation Development' }, count_results: 12 },
  capacitySharing: { indicator: { indicator_id: 1, name: 'Capacity Sharing' }, count_results: 20 },
  policyChange: { indicator: { indicator_id: 4, name: 'Policy Change' }, count_results: 8 },
  oicr: { indicator: { indicator_id: 5, name: 'OICR' }, count_results: 3 }
};

/** The 10 card titles, verbatim from `requirements.md` §4.1 / the mapper's `BAND_DEFINITIONS`. */
const METADATA_CARD_TITLES = [
  'Innovation Nature',
  'Innovation Type',
  'Current Readiness',
  'OICR Maturity',
  'Policy Type',
  'Stage in Policy Process',
  'Training or engagement to report',
  'Training vs. Engagement',
  'Gender',
  'Degree'
] as const;

/** Mirrors `indicator-metadata-bands.mapper.ts`'s `buildCard` transform, so per-instance assertions bind against the same shape the mapper produces. */
function metadataItems(rows: IndicatorMetadataCount[]): { id: string; label: string; count: number }[] {
  return rows.map(row => ({ id: String(row.id), label: row.name ?? UNLABELLED_CATEGORY_FALLBACK, count: row.count }));
}

describe('ProjectDashboardComponent', () => {
  let fixture: ComponentFixture<ProjectDashboardComponent>;
  let component: ProjectDashboardComponent;
  let apiMock: { GET_ResultsCount: jest.Mock; GET_Results: jest.Mock };
  let reportsMock: ReturnType<typeof createReportsMock>;
  let geoScopeMock: { main: jest.Mock };
  let resultsCenterServiceMock: { initializeProjectDashboardResultsTable: jest.Mock };
  let fileManagerServiceMock: { uploadFile: jest.Mock };
  let documentOverviewServiceMock: {
    fetchDocumentOverviewSummary: jest.Mock;
    generateDocumentOverview: jest.Mock;
    deleteDocumentOverviewFiles: jest.Mock;
  };
  let rolesServiceMock: { isAdmin: jest.Mock };
  let actionsServiceMock: { showToast: jest.Mock };
  let allModalsServiceMock: {
    openModal: jest.Mock;
    setModalWidth: jest.Mock;
    isModalOpen: jest.Mock;
    modalConfig: ReturnType<typeof signal>;
  };

  function createFile(name: string, size = 1024, type = 'application/pdf'): File {
    return new File([new ArrayBuffer(size)], name, { type });
  }

  function createFileInput(files: File[]): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: files });
    return input;
  }

  /**
   * Single mock for `GetFullContractReportsService` (T-07), replacing the
   * four retired `GetTop*Service` mocks. Sections default empty so the
   * existing empty-state assertions keep their meaning; tests that need a
   * realistic full payload apply the shared fixture explicitly via
   * `applyFixtureToReportsMock` rather than hand-rolling data (client guide:
   * never reinvent fixtures).
   */
  function createReportsMock() {
    return {
      payload: signal<ContractFullReports | null>(null),
      loading: signal(false),
      loadError: signal(false),
      topPartners: signal<any[]>([]),
      topPrimaryLevers: signal<any[]>([]),
      topMainContactPersons: signal<any[]>([]),
      topContributors: signal<any[]>([]),
      staff: signal<any[]>([]),
      geoScope: signal<ContractFullReports['geo_scope'] | null>(null),
      /**
       * T-14 hard prerequisite #1 (`tasks.md` § T-14, found by T-10's
       * review). Mirrors `GetFullContractReportsService`'s 10 new per-section
       * `computed` accessors (`get-full-contract-reports.service.ts`) as
       * independent writable signals, exactly like the six Chunk A sections
       * above -- so this mock is a faithful stand-in for the real service's
       * public shape, not only for `payload()` (which the host reads
       * directly to build `indicatorMetadataBands()`).
       */
      innovationNature: signal<IndicatorMetadataCount[]>([]),
      innovationType: signal<IndicatorMetadataCount[]>([]),
      innovationReadiness: signal<IndicatorMetadataCount[]>([]),
      oicrMaturity: signal<IndicatorMetadataCount[]>([]),
      policyType: signal<IndicatorMetadataCount[]>([]),
      policyStage: signal<IndicatorMetadataCount[]>([]),
      sessionFormat: signal<IndicatorMetadataCount[]>([]),
      sessionType: signal<IndicatorMetadataCount[]>([]),
      genderDistribution: signal<IndicatorMetadataCount[]>([]),
      degree: signal<IndicatorMetadataCount[]>([]),
      main: jest.fn(),
      update: jest.fn()
    };
  }

  /** Drives all four ranked sections, plus the 10 indicator-metadata sections (T-14), of `reportsMock` from one `ContractFullReports` payload. */
  function applyFixtureToReportsMock(mock: ReturnType<typeof createReportsMock>, data: ContractFullReports): void {
    mock.payload.set(data);
    mock.topPartners.set(data.top_partners);
    mock.topPrimaryLevers.set(data.top_primary_levers);
    mock.topMainContactPersons.set(data.top_main_contact_persons);
    mock.topContributors.set(data.top_contributors);
    mock.staff.set(data.staff);
    mock.geoScope.set(data.geo_scope);
    // T-14 hard prerequisite #1.
    mock.innovationNature.set(data.innovation_nature);
    mock.innovationType.set(data.innovation_type);
    mock.innovationReadiness.set(data.innovation_readiness);
    mock.oicrMaturity.set(data.oicr_maturity);
    mock.policyType.set(data.policy_type);
    mock.policyStage.set(data.policy_stage);
    mock.sessionFormat.set(data.session_format);
    mock.sessionType.set(data.session_type);
    mock.genderDistribution.set(data.gender_distribution);
    mock.degree.set(data.degree);
  }

  /** Every `app-project-dashboard-card` stub instance currently rendered by the host. */
  function getCardDebugElements(): DebugElement[] {
    return fixture.debugElement.queryAll(By.directive(ProjectDashboardCardStubComponent));
  }

  /** Every real `app-indicator-metadata-band` instance currently rendered by the host (T-14). Bands are not stubbed (DD-6/DD-9 -- state is host-owned, chrome is real), so counting/querying them carries no superset hazard. */
  function getMetadataBandDebugElements(): DebugElement[] {
    return fixture.debugElement.queryAll(By.directive(IndicatorMetadataBandComponent));
  }

  /** The "Indicator metadata" section heading, or `null` when R-IMC-009 AC.3 hides it entirely. */
  function getMetadataHeading(): DebugElement | null {
    return (
      fixture.debugElement
        .queryAll(By.css('h2'))
        .find(element => (element.nativeElement as HTMLElement).textContent?.trim() === 'Indicator metadata') ?? null
    );
  }

  function getCardByTitle(title: string): ProjectDashboardCardStubComponent {
    const match = getCardDebugElements().find(
      element => (element.componentInstance as ProjectDashboardCardStubComponent).title === title
    );
    if (!match) {
      throw new Error(`No stub card found for title "${title}"`);
    }
    return match.componentInstance as ProjectDashboardCardStubComponent;
  }

  async function setup(
    contractId: string | null = 'C-1',
    options?: {
      isAdmin?: boolean;
      emptyOverview?: boolean;
      rejectOverviewFetch?: boolean;
      /**
       * T-14 hard prerequisite #2 (`tasks.md` § T-14, found by T-13's
       * review). `setup()` had no way to seed `GET_ResultsCount`'s
       * `indicators` array with a real band id (1/2/4/5), so no test could
       * produce a single Indicator-metadata band. Defaults to the
       * pre-existing fixture below (ids 10/99/null -- zero bands), so every
       * existing call site that omits this option is unaffected.
       */
      indicators?: Array<Record<string, unknown>>;
      /**
       * T-14 / DC-13: whether a metadata card renders a toggle, exposes the
       * correct `aria-expanded`, and lets its overlay behave all live inside
       * `ProjectDashboardCardComponent`'s own template (design §7.2 / DD-10)
       * -- per the doubles policy (`tasks.md` §4) a stub cannot be evidence
       * for any of that. When `true`, the real card renders in place of
       * `ProjectDashboardCardStubComponent` for the DC-13 boundary tests;
       * every other test in this file legitimately keeps the stub for
       * input/output assertions only.
       */
      renderRealCards?: boolean;
    }
  ) {
    reportsMock = createReportsMock();
    geoScopeMock = { main: jest.fn() };
    resultsCenterServiceMock = { initializeProjectDashboardResultsTable: jest.fn() };
    fileManagerServiceMock = {
      uploadFile: jest.fn().mockResolvedValue({ data: { filename: 'stored-file.pdf' } })
    };
    documentOverviewServiceMock = {
      fetchDocumentOverviewSummary: options?.rejectOverviewFetch
        ? jest.fn().mockRejectedValue(new Error('fetch failed'))
        : jest.fn().mockResolvedValue(
          options?.emptyOverview
            ? { overview: { project_summary: '' } }
            : {
              overview: {
                project_summary: 'Stored overview paragraph.\n\nSecond stored paragraph.'
              },
              generated_at: '2026-07-09T20:10:56.921192+00:00',
              available_files: [
                {
                  file_name: 'stored-file.pdf',
                  file_key: 'star/ai-insights/test/project-overview/projects/C-1/stored-file.pdf'
                }
              ],
              documents_processed: [
                {
                  file_name: 'stored-file.pdf',
                  file_key: 'star/ai-insights/test/project-overview/projects/C-1/stored-file.pdf'
                }
              ]
            }
        ),
      generateDocumentOverview: jest.fn().mockResolvedValue({
        overview: {
          project_summary: 'First overview paragraph.\n\nSecond overview paragraph.'
        },
        generated_at: '2026-07-10T14:05:25.094Z',
        available_files: [
          {
            file_name: 'contract.pdf',
            file_key: 'star/ai-insights/test/project-overview/projects/C-1/stored-file.pdf'
          }
        ],
        documents_processed: [
          {
            file_name: 'contract.pdf',
            file_key: 'star/ai-insights/test/project-overview/projects/C-1/stored-file.pdf'
          }
        ]
      }),
      deleteDocumentOverviewFiles: jest.fn().mockResolvedValue(undefined)
    };
    actionsServiceMock = { showToast: jest.fn(), showGlobalAlert: jest.fn() };
    allModalsServiceMock = {
      openModal: jest.fn(),
      setModalWidth: jest.fn(),
      isModalOpen: jest.fn().mockReturnValue({ isOpen: false, title: 'Grounding & Setup', isWide: true }),
      modalConfig: signal({
        projectGroundingSetup: { isOpen: false, title: 'Grounding & Setup', isWide: true }
      })
    };
    rolesServiceMock = { isAdmin: jest.fn().mockReturnValue(options?.isAdmin ?? true) };
    apiMock = {
      GET_ResultsCount: jest.fn().mockResolvedValue({
        data: {
          grant_amount: 1234,
          divisionId: 'D1',
          division: 'Division',
          unitId: 'U1',
          unit: 'Unit',
          indicators: options?.indicators ?? [
            // T-13 (indicator-metadata-charts): id was `1` before this spec
            // existed. `1` is `CAPACITY_SHARING_INDICATOR_ID`
            // (star-pdf-report.util.ts), one of the four real band ids the
            // new Indicator-metadata section now keys off of
            // (indicator-metadata-bands.mapper.ts) — with `1`, this fixture
            // incidentally produced a real Capacity Sharing band (4 cards),
            // which broke every test asserting an exact card count/title
            // list below. Changed to `10`, an id no band definition uses, so
            // this fixture stays about the 4 ranked cards it was written for.
            // T-14: tests that need a real band pass `options.indicators`
            // explicitly (`BAND_INDICATOR_FIXTURES`) rather than mutating
            // this default, which every pre-existing test still relies on.
            { indicator: { indicator_id: 10, name: 'Output' }, count_results: 2 },
            { indicator_id: 99, full_name: 'Fallback indicator', count_results: 4 },
            { indicator_id: null, count_results: undefined }
          ]
        }
      }),
      GET_Results: jest.fn().mockResolvedValue({
        data: {
          results: [
            { result_status: { result_status_id: 2, name: 'Submitted', config: { color: { text: '#111111' } } } },
            { result_status: { result_status_id: 2, name: 'Submitted', config: { color: { text: '#111111' } } } },
            { result_status: { result_status_id: 1 } },
            { result_status: { result_status_id: 'invalid' } }
          ]
        }
      })
    };

    await TestBed.configureTestingModule({
      imports: [ProjectDashboardComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { parent: { snapshot: { paramMap: convertToParamMap(contractId ? { id: contractId } : {}) } } } },
        { provide: ApiService, useValue: apiMock },
        {
          provide: ProjectUtilsService,
          useValue: {
            getLeverName: jest.fn().mockReturnValue('Lever name'),
            sortIndicators: jest.fn((items: any[]) => items)
          }
        },
        { provide: ResultsCenterService, useValue: resultsCenterServiceMock },
        { provide: FileManagerService, useValue: fileManagerServiceMock },
        { provide: DocumentOverviewService, useValue: documentOverviewServiceMock },
        { provide: RolesService, useValue: rolesServiceMock },
        { provide: ActionsService, useValue: actionsServiceMock },
        { provide: AllModalsService, useValue: allModalsServiceMock }
      ]
    })
      .overrideComponent(ProjectDashboardComponent, {
        remove: {
          imports: options?.renderRealCards
            ? [GeoScopeCardComponent, ResultsCenterTableComponent]
            : [ProjectDashboardCardComponent, GeoScopeCardComponent, ResultsCenterTableComponent],
          providers: [GetFullContractReportsService, GetGeoScopeService]
        },
        add: {
          imports: options?.renderRealCards
            ? [GeoScopeCardStubComponent, ResultsCenterTableStubComponent]
            : [ProjectDashboardCardStubComponent, GeoScopeCardStubComponent, ResultsCenterTableStubComponent],
          providers: [
            { provide: GetFullContractReportsService, useValue: reportsMock },
            { provide: GetGeoScopeService, useValue: geoScopeMock }
          ]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(ProjectDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /**
   * T-14: seeds all four real bands (`BAND_INDICATOR_FIXTURES`) and applies a
   * fully populated, distinct-per-section fixture -- R-IMC-008's own
   * scenario ("GIVEN a payload where all 10 sections carry distinct,
   * non-empty data"). `policy_stage` is overridden because the canonical
   * fixture deliberately leaves it `[]` (R-IMC-007 AC.2 evidence); this
   * scenario needs every one of the 10 sections non-empty instead.
   */
  async function setupWithAllBandsAndFixture(): Promise<ContractFullReports> {
    await setup('C-1', {
      indicators: [
        BAND_INDICATOR_FIXTURES.innovationDevelopment,
        BAND_INDICATOR_FIXTURES.capacitySharing,
        BAND_INDICATOR_FIXTURES.policyChange,
        BAND_INDICATOR_FIXTURES.oicr
      ]
    });
    const fixtureData = mockContractFullReports({
      policy_stage: [
        { id: 1, name: 'Stage 1 description', count: 6 },
        { id: 2, name: 'Stage 2 description', count: 4 }
      ]
    });
    applyFixtureToReportsMock(reportsMock, fixtureData);
    fixture.detectChanges();
    return fixtureData;
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should load project dashboard data for the parent contract', async () => {
    await setup();

    expect(apiMock.GET_ResultsCount).toHaveBeenCalledWith('C-1');
    expect(apiMock.GET_Results).toHaveBeenCalledWith(
      { 'contract-codes': ['C-1'] },
      undefined,
      { page: 1, limit: 10000, sortField: 'code', sortOrder: 'DESC' }
    );
    // R-PDB-001 AC.1/AC.2 at spy level (DC-2): exactly one call to the single
    // service, per T-05's rewire. Request/URL evidence itself lives in T-01's
    // HttpTestingController-based spec — this harness has no mock backend.
    expect(reportsMock.main).toHaveBeenCalledTimes(1);
    expect(reportsMock.main).toHaveBeenCalledWith('C-1');
    expect(geoScopeMock.main).toHaveBeenCalledWith('C-1');
    expect(resultsCenterServiceMock.initializeProjectDashboardResultsTable).toHaveBeenCalledWith('C-1');
  });

  // T-08 (R-PDB-008): the four `GetTop*Service`s this case used to gate at
  // spy level (R-PDB-001 AC.2 / DC-2) are deleted along with their client
  // methods — the services no longer exist, so there is nothing left to
  // assert "never called". The remaining half of this case (one `main()`
  // call on the single reports service) is not lost: it is already asserted
  // above in "should load project dashboard data for the parent contract".
  // Substituting a weaker assertion here to keep a test count up would be
  // decorative, so the case is removed rather than watered down.

  it('should compute project summaries and formatted labels', async () => {
    await setup();

    expect(component.indicatorSummaries().map(item => item.label)).toEqual(['Fallback indicator', 'Output', 'Indicator']);
    expect(component.totalProjectResults()).toBe(6);
    expect(component.indicatorsWithResults().map(item => item.value)).toEqual([4, 2]);
    expect(component.indicatorSharePercent(3)).toBe(50);
  });

  it('should handle empty project response and empty contract id', async () => {
    await setup(null);

    expect(apiMock.GET_ResultsCount).not.toHaveBeenCalled();
    expect(component.contractId()).toBe('');
    expect(component.indicatorSharePercent(1)).toBe(0);
  });

  it('should set empty project when the project endpoint has no data', async () => {
    await setup();
    apiMock.GET_ResultsCount.mockResolvedValueOnce({});

    await (component as any).loadProject('C-2');

    expect(component.project()).toEqual({});
  });

  it('should build and sort ranked service items', async () => {
    await setup();

    reportsMock.topContributors.set([
      { contract_code: 'C-2', contract_description: 'Contributor', results_count: 1 },
      { project_name: 'Only project', count: 3 },
      { contract_id: 'C-3' },
      {}
    ]);
    reportsMock.topMainContactPersons.set([
      { name: 'Named', results_count: 1, email: 'named@example.com' },
      { full_name: 'Full Name', count: 2 },
      { contact_person_name: 'Contact Name', value: 3 },
      { label: 'Label Name' },
      { first_name: 'First', last_name: 'Last' },
      {}
    ]);
    // `institution_id: undefined` / `{}` (no `institution_id` at all) are
    // OFF-DTO: `ContractFullReportsPartner.institution_id` is a required,
    // non-nullable `number` and E-05.2 records the null case as unreachable
    // in production (the query is an `INNER JOIN clarisa_institutions`).
    // They exist here only to pin `getPartnerItemId`'s literal
    // `String(item.institution_id)` behaviour (no fallback chain) against a
    // permissive `signal<any[]>` mock — do not read the resulting
    // `['undefined','null','2','undefined']` ids below as sanctioned
    // production output.
    reportsMock.topPartners.set([
      { institution_id: 2, acronym: 'ABC', institution_name: 'Institution', results_count: 1 },
      { institution_id: null, partner_name: 'Partner', count: 2 },
      { institution_id: undefined, count: 3 },
      {}
    ]);
    reportsMock.topPrimaryLevers.set([
      { lever_id: 1, short_name: 'RA', full_name: 'RA: Research area', count: 1, icon: 'icon.svg' },
      { lever_id: 2, short_name: 'L', full_name: 'L:', count: 3 },
      { lever_id: 3, short_name: '', full_name: '', count: 2 }
    ]);

    expect(component.contributorItems().map(item => item.label)).toEqual(['Only project', 'C-2 - Contributor', 'C-3', '—']);
    // T-05 dropped the `results_count`/`value` fallbacks that the retired
    // services used — `count` is now the sole numeric field (matches the
    // full-payload DTOs), so "Contact Name" (`value: 3`, no `count`) sorts
    // as a 0-count tie rather than ranking first.
    expect(component.mainContactPersonItems().map(item => item.label)).toEqual([
      'Full Name',
      'Named',
      'Contact Name',
      'Label Name',
      'First Last',
      '—'
    ]);
    // T-05 dropped `getPartnerItemId`'s fallback chain — `id` is now
    // `String(item.institution_id)` verbatim (E-05.2), so a null/undefined
    // id stringifies literally rather than falling back to a label or index.
    expect(component.partnerItems().map(item => item.id)).toEqual(['undefined', 'null', '2', 'undefined']);
    expect(component.partnerItems().map(item => item.label)).toContain('ABC - Institution');
    expect(component.leverItems().map(item => item.label)).toEqual(['L', '—', 'RA - RESEARCH AREA']);
  });

  it('should handle status response without result rows and lever labels with empty prefixes', async () => {
    await setup();
    apiMock.GET_Results.mockResolvedValueOnce({});

    await (component as any).loadProjectResultsByStatus('C-2');

    expect(component.statusChartItems()).toEqual([]);

    reportsMock.topPrimaryLevers.set([{ lever_id: 4, short_name: 'RA', full_name: ': Research area', count: 1 }]);
    expect(component.leverItems()[0].label).toBe('RA - RESEARCH AREA');
  });

  it('should compute empty states from loading, error, and list signals', async () => {
    await setup();

    expect(component.contributorsEmpty()).toBe(true);
    expect(component.mainContactPersonsEmpty()).toBe(true);
    expect(component.partnersEmpty()).toBe(true);
    expect(component.leversEmpty()).toBe(true);

    // The `loading` guard: with one shared service, this signal drives all
    // four cards at once (T-05), so a single `set` must flip all four.
    reportsMock.loading.set(true);
    expect(component.contributorsEmpty()).toBe(false);
    expect(component.mainContactPersonsEmpty()).toBe(false);
    expect(component.partnersEmpty()).toBe(false);
    expect(component.leversEmpty()).toBe(false);
    reportsMock.loading.set(false);

    // The `loadError` guard: error must win over empty, for the same reason.
    reportsMock.loadError.set(true);
    expect(component.contributorsEmpty()).toBe(false);
    expect(component.mainContactPersonsEmpty()).toBe(false);
    expect(component.partnersEmpty()).toBe(false);
    expect(component.leversEmpty()).toBe(false);
    reportsMock.loadError.set(false);

    // A non-empty list also flips its own `*Empty()` computed.
    reportsMock.topContributors.set([{}]);
    reportsMock.topMainContactPersons.set([{}]);
    reportsMock.topPartners.set([{}]);
    reportsMock.topPrimaryLevers.set([{}]);
    expect(component.contributorsEmpty()).toBe(false);
    expect(component.mainContactPersonsEmpty()).toBe(false);
    expect(component.partnersEmpty()).toBe(false);
    expect(component.leversEmpty()).toBe(false);
  });

  it('should compute status chart values and handle failures', async () => {
    await setup();

    expect(component.statusChartItems()).toEqual([
      { color: '#111111', label: 'Submitted', value: 2, result_status_id: 2 },
      { color: '#1689CA', label: 'Unknown status', value: 1, result_status_id: 1 }
    ]);
    expect(component.statusBarsMax()).toBe(2);
    expect(component.statusBarFillPercent(1)).toBe(50);
    expect(component.statusBarFillPercent(5)).toBe(100);

    apiMock.GET_Results.mockRejectedValueOnce(new Error('fail'));
    await (component as any).loadProjectResultsByStatus('C-2');

    expect(component.statusChartItems()).toEqual([]);
    expect(component.statusChartError()).toBe(true);
    expect(component.statusChartLoading()).toBe(false);
    expect(component.statusBarsMax()).toBe(0);
    expect(component.statusBarFillPercent(1)).toBe(0);
  });

  it('should compute zero share when indicator value is not positive', async () => {
    await setup();

    expect(component.indicatorSharePercent(0)).toBe(0);
  });

  describe('ranked chart cards — host↔card seam (T-07 / R-PDB-002, 003, 004, 005, 007)', () => {
    it('should pass the correct title, items, layout, and visibleLimit to each ranked card', async () => {
      await setup();
      const fixtureData = mockContractFullReports();
      applyFixtureToReportsMock(reportsMock, fixtureData);
      fixture.detectChanges();

      const partners = getCardByTitle('Results Partners');
      expect(partners.items).toEqual(component.partnerItems());
      expect(partners.layout).toBe('rows-partners');
      expect(partners.visibleLimit).toBe(COLLAPSED_ITEM_LIMIT);

      const levers = getCardByTitle('Primary Levers');
      expect(levers.items).toEqual(component.leverItems());
      expect(levers.layout).toBe('rows-stacked-lever');
      expect(levers.visibleLimit).toBe(COLLAPSED_ITEM_LIMIT);

      const contacts = getCardByTitle('Main contact person');
      expect(contacts.items).toEqual(component.mainContactPersonItems());
      expect(contacts.layout).toBe('rows-stacked-lever');
      expect(contacts.itemHeightPx).toBe(43);
      expect(contacts.visibleLimit).toBe(COLLAPSED_ITEM_LIMIT);

      const contributors = getCardByTitle('Contributing projects');
      expect(contributors.items).toEqual(component.contributorItems());
      expect(contributors.layout).toBe('rows-stacked-lever');
      expect(contributors.itemHeightPx).toBe(43);
      expect(contributors.visibleLimit).toBe(COLLAPSED_ITEM_LIMIT);
    });

    it('should render the four renamed chart titles exactly as specified by R-PDB-007', async () => {
      await setup();

      const titles = getCardDebugElements().map(element => (element.componentInstance as ProjectDashboardCardStubComponent).title);

      expect(titles).toEqual(['Results Partners', 'Primary Levers', 'Main contact person', 'Contributing projects']);
      for (const title of titles) {
        expect(title.startsWith('Top ')).toBe(false);
      }
    });

    it('should start a fresh component instance fully collapsed (AC.6)', async () => {
      await setup();

      expect(component.expanded().size).toBe(0);
      for (const debugElement of getCardDebugElements()) {
        expect((debugElement.componentInstance as ProjectDashboardCardStubComponent).visibleLimit).toBe(COLLAPSED_ITEM_LIMIT);
      }
    });

    it('should flip host expansion state and push a new visibleLimit down when the stub emits expandToggled, using a new Set (DC-11)', async () => {
      await setup();

      const beforeToggle = component.expanded();
      expect(getCardByTitle('Results Partners').visibleLimit).toBe(COLLAPSED_ITEM_LIMIT);

      getCardByTitle('Results Partners').expandToggled.emit();
      fixture.detectChanges();

      const afterExpand = component.expanded();
      expect(afterExpand).not.toBe(beforeToggle);
      expect(afterExpand.has('partners')).toBe(true);
      expect(getCardByTitle('Results Partners').visibleLimit).toBeNull();

      // AC.4: expanding one card leaves the other three collapsed.
      expect(getCardByTitle('Primary Levers').visibleLimit).toBe(COLLAPSED_ITEM_LIMIT);
      expect(getCardByTitle('Main contact person').visibleLimit).toBe(COLLAPSED_ITEM_LIMIT);
      expect(getCardByTitle('Contributing projects').visibleLimit).toBe(COLLAPSED_ITEM_LIMIT);

      const beforeCollapse = component.expanded();
      getCardByTitle('Results Partners').expandToggled.emit();
      fixture.detectChanges();

      const afterCollapse = component.expanded();
      expect(afterCollapse).not.toBe(beforeCollapse);
      expect(afterCollapse.has('partners')).toBe(false);
      expect(getCardByTitle('Results Partners').visibleLimit).toBe(COLLAPSED_ITEM_LIMIT);
    });

    it('should preserve each card expansion state through a loadError → update() retry cycle of the same contract (AC.7)', async () => {
      await setup();
      applyFixtureToReportsMock(reportsMock, mockContractFullReports());
      fixture.detectChanges();

      getCardByTitle('Results Partners').expandToggled.emit();
      getCardByTitle('Contributing projects').expandToggled.emit();
      fixture.detectChanges();

      expect(component.expanded()).toEqual(new Set(['partners', 'contributors']));

      // Drive the mock through the real retry transitions
      // (get-full-contract-reports.service.ts:39-65): a transient failure
      // clears `payload` and sets `loadError`, then the SAME contract's
      // retry replaces `payload` with a NEW object identity. Two payload
      // identity changes total — a payload-keyed reset (the defect AC.7
      // forbids) would collapse both cards at the failure step already.
      reportsMock.payload.set(null);
      reportsMock.loadError.set(true);
      fixture.detectChanges();

      // Fire the retry through the real seam: the production template binds
      // `(retry)="reports.update()"` on every card
      // (project-dashboard.component.html), so this is what a user's "Try
      // again" click actually does.
      getCardByTitle('Results Partners').retry.emit();
      expect(reportsMock.update).toHaveBeenCalledTimes(1);

      reportsMock.loadError.set(false);
      reportsMock.payload.set(mockContractFullReports());
      fixture.detectChanges();

      expect(component.expanded()).toEqual(new Set(['partners', 'contributors']));
      expect(getCardByTitle('Results Partners').visibleLimit).toBeNull();
      expect(getCardByTitle('Contributing projects').visibleLimit).toBeNull();
      expect(getCardByTitle('Primary Levers').visibleLimit).toBe(COLLAPSED_ITEM_LIMIT);
      expect(getCardByTitle('Main contact person').visibleLimit).toBe(COLLAPSED_ITEM_LIMIT);
    });

    it('should derive every ranked id from a payload identifier and keep homonymous contacts distinct with no track collision (R-PDB-005)', async () => {
      await setup();
      const fixtureData = mockContractFullReports();
      applyFixtureToReportsMock(reportsMock, fixtureData);
      fixture.detectChanges();

      const contacts = getCardByTitle('Main contact person').items as { id: string; label: string }[];

      expect(contacts).toHaveLength(fixtureData.top_main_contact_persons.length);
      const homonyms = contacts.filter(item => item.label === 'Maria Rodriguez');
      expect(homonyms).toHaveLength(2);
      expect(homonyms.map(item => item.id).sort()).toEqual(['contact-1', 'contact-2']);

      // No `@for` track collision for any of the four sections at full
      // length (R-PDB-005 AC.2): ids only need to be unique *within* the
      // `@for` each card renders, not across cards — a partner and a lever
      // legitimately reusing the same numeric id is not a collision.
      for (const debugElement of getCardDebugElements()) {
        const ids = ((debugElement.componentInstance as ProjectDashboardCardStubComponent).items as { id: string }[]).map(
          item => item.id
        );
        expect(new Set(ids).size).toBe(ids.length);
      }
    });
  });

  /**
   * T-14 (design.md §7.2/§7.5, §10 "Host specs" row; requirements.md
   * R-IMC-008/009/010/011, §9 DC-5/DC-6/DC-13). The two hard prerequisites
   * this task owns first (`createReportsMock`/`applyFixtureToReportsMock`
   * carrying the 10 new sections; `setup()` gaining an `indicators` hook)
   * are extended above; everything below is the mechanical proof T-13's
   * boxes 1-4 were left owing.
   */
  describe('Indicator metadata — band visibility (R-IMC-009, DC-6)', () => {
    it('renders the "Indicator metadata" heading and all 4 bands when every indicator has results (present)', async () => {
      await setupWithAllBandsAndFixture();

      expect(getMetadataHeading()).not.toBeNull();
      expect(getMetadataBandDebugElements()).toHaveLength(4);
    });

    it('renders no OICR band and no OICR card for an indicator with zero results, leaving other bands visible (absent, R-IMC-009 AC.1, "no OICR work" scenario)', async () => {
      await setup('C-1', {
        indicators: [
          BAND_INDICATOR_FIXTURES.innovationDevelopment,
          { indicator: { indicator_id: 5, name: 'OICR' }, count_results: 0 }
        ]
      });
      applyFixtureToReportsMock(reportsMock, mockContractFullReports());
      fixture.detectChanges();

      expect(component.indicatorMetadataBands().some(band => band.indicatorId === 5)).toBe(false);
      expect(() => getCardByTitle('OICR Maturity')).toThrow();
      // BUT it must NOT hide the Innovation Development band.
      expect(getCardByTitle('Current Readiness')).toBeTruthy();
    });

    it('renders no "Indicator metadata" heading at all when no indicator has results (default fixture, R-IMC-009 AC.3 -- free, per tasks.md)', async () => {
      await setup();

      expect(component.indicatorMetadataBands()).toEqual([]);
      expect(getMetadataHeading()).toBeNull();
      expect(getMetadataBandDebugElements()).toHaveLength(0);
    });

    it('renders a visible band with an unanswered-field empty state when the indicator has results but every one of its sections is empty (all-null, DC-6 / R-IMC-010)', async () => {
      await setup('C-1', { indicators: [BAND_INDICATOR_FIXTURES.capacitySharing] });
      applyFixtureToReportsMock(
        reportsMock,
        mockContractFullReports({ session_format: [], session_type: [], gender_distribution: [], degree: [] })
      );
      fixture.detectChanges();

      expect(getMetadataBandDebugElements()).toHaveLength(1);
      for (const title of ['Training or engagement to report', 'Training vs. Engagement', 'Gender', 'Degree']) {
        const card = getCardByTitle(title);
        expect(card.empty).toBe(true);
        expect(card.emptyMessage).toBe('No data is recorded for this field on this project. (20 results.)');
      }
    });

    it('renders a visible band over empty sections when a project links results only to non-primary contracts (all-non-primary, DC-6 / design §7.5)', async () => {
      await setup('C-1', { indicators: [BAND_INDICATOR_FIXTURES.policyChange] });
      applyFixtureToReportsMock(reportsMock, mockContractFullReports({ policy_type: [], policy_stage: [] }));
      fixture.detectChanges();

      expect(getMetadataBandDebugElements()).toHaveLength(1);
      const message = 'No data is recorded for this field on this project. (8 results.)';
      for (const title of ['Policy Type', 'Stage in Policy Process']) {
        const card = getCardByTitle(title);
        expect(card.empty).toBe(true);
        expect(card.emptyMessage).toBe(message);
        // W-7 (design §7.5): the copy must not assert WHY the section is
        // empty -- the true reason here (is_primary scoping) differs from
        // the all-null case above, and the copy must not distinguish them.
        // T-15 A-1: asserted against `card.emptyMessage` (the production
        // value), not the `message` literal above -- that literal is
        // test-local, so a regex on it can never redden from a production
        // change and would silently stop gating W-7 the moment this test's
        // own literal were edited for new copy.
        expect(card.emptyMessage).not.toMatch(/unanswered|left this|primary/i);
      }
    });
  });

  /**
   * T-15 A-2: nothing in this file referenced `collapsedBands`,
   * `toggleBandCollapse` or `isBandCollapsed` before this case existed --
   * T-12's own spec (`indicator-metadata-band.component.spec.ts`) proves the
   * collapse *mechanism* (an unbound `collapsed` input hides projected
   * content; an activated toggle emits `collapseToggled`), but nothing
   * proved the *host* wires that mechanism up. Deleting either
   * `[collapsed]="isBandCollapsed(band.indicatorId)"` or
   * `(collapseToggled)="toggleBandCollapse(band.indicatorId)"` from
   * `project-dashboard.component.html` left the entire suite green before
   * this case existed (the A-07.6-shaped dead-button mutant). One test
   * closes it: the metadata cards come from a single `@for`
   * (`project-dashboard.component.html`), so unlike A-07.6 there is no
   * per-instance multiplication to cover.
   */
  describe('Indicator metadata — band collapse wiring (T-15 A-2, host connects the mechanism)', () => {
    it("collapses a band's projected cards when its own toggle is activated, and the host is what makes that happen", async () => {
      await setup('C-1', { indicators: [BAND_INDICATOR_FIXTURES.capacitySharing] });
      applyFixtureToReportsMock(reportsMock, mockContractFullReports());
      fixture.detectChanges();

      // Sanity: the band starts expanded (R-IMC-008 "Details") and its
      // projected cards are present.
      expect(component.isBandCollapsed(BAND_INDICATOR_FIXTURES.capacitySharing.indicator.indicator_id)).toBe(false);
      expect(getCardByTitle('Gender')).toBeTruthy();

      const bandElement = getMetadataBandDebugElements()[0].nativeElement as HTMLElement;
      const toggle = bandElement.querySelector('button.imb-toggle') as HTMLButtonElement;
      expect(toggle).not.toBeNull();

      toggle.click();
      fixture.detectChanges();

      // If the host did not forward the band's `(collapseToggled)` to
      // `toggleBandCollapse`, or did not feed `isBandCollapsed` back into
      // `[collapsed]`, the band's own `@if (!collapsed())` never flips and
      // its projected cards stay rendered -- either deletion reddens this.
      expect(component.isBandCollapsed(BAND_INDICATOR_FIXTURES.capacitySharing.indicator.indicator_id)).toBe(true);
      expect(() => getCardByTitle('Gender')).toThrow();
    });
  });

  describe('Indicator metadata — ten per-instance card bindings (R-IMC-008 AC.1/AC.2, DC-5)', () => {
    // R-IMC-008 scenario "Ten cards, ten distinct bindings": each assertion
    // below is bound to its OWN card via `getCardByTitle`, never to a shared
    // index or count (tasks.md's superset-hazard warning) -- a cross-wire
    // between any two sections in the host template reddens exactly the pair
    // of tests naming those two titles, never all ten at once.

    it('binds the Innovation Nature card to its own section only', async () => {
      const fixtureData = await setupWithAllBandsAndFixture();
      expect(getCardByTitle('Innovation Nature').items).toEqual(metadataItems(fixtureData.innovation_nature));
    });

    it('binds the Innovation Type card to its own section only', async () => {
      const fixtureData = await setupWithAllBandsAndFixture();
      expect(getCardByTitle('Innovation Type').items).toEqual(metadataItems(fixtureData.innovation_type));
    });

    it('binds the Current Readiness card to its own section only', async () => {
      const fixtureData = await setupWithAllBandsAndFixture();
      expect(getCardByTitle('Current Readiness').items).toEqual(metadataItems(fixtureData.innovation_readiness));
    });

    it('binds the OICR Maturity card to its own section only', async () => {
      const fixtureData = await setupWithAllBandsAndFixture();
      expect(getCardByTitle('OICR Maturity').items).toEqual(metadataItems(fixtureData.oicr_maturity));
    });

    it('binds the Policy Type card to its own section only', async () => {
      const fixtureData = await setupWithAllBandsAndFixture();
      expect(getCardByTitle('Policy Type').items).toEqual(metadataItems(fixtureData.policy_type));
    });

    it('binds the Stage in Policy Process card to its own section only', async () => {
      const fixtureData = await setupWithAllBandsAndFixture();
      expect(getCardByTitle('Stage in Policy Process').items).toEqual(metadataItems(fixtureData.policy_stage));
    });

    it('binds the Training or engagement to report card to its own section only', async () => {
      const fixtureData = await setupWithAllBandsAndFixture();
      expect(getCardByTitle('Training or engagement to report').items).toEqual(
        metadataItems(fixtureData.session_format)
      );
    });

    it('binds the Training vs. Engagement card to its own section only', async () => {
      const fixtureData = await setupWithAllBandsAndFixture();
      expect(getCardByTitle('Training vs. Engagement').items).toEqual(metadataItems(fixtureData.session_type));
    });

    it('binds the Gender card to its own section only', async () => {
      const fixtureData = await setupWithAllBandsAndFixture();
      expect(getCardByTitle('Gender').items).toEqual(metadataItems(fixtureData.gender_distribution));
    });

    it('binds the Degree card to its own section only', async () => {
      const fixtureData = await setupWithAllBandsAndFixture();
      expect(getCardByTitle('Degree').items).toEqual(metadataItems(fixtureData.degree));
    });
  });

  describe('Indicator metadata — expansion boundary at the 5-category threshold (DC-13)', () => {
    /**
     * DC-13 requires the toggle's actual presence/absence, `aria-expanded`,
     * and the host handling `expandToggled` -- all of that lives inside
     * `ProjectDashboardCardComponent`'s own template (design §7.2 / DD-10).
     * Per the doubles policy (`tasks.md` §4 / KZ-001) a stub cannot be the
     * evidence for any of it, so `renderRealCards: true` keeps the real card
     * mounted here instead. Every other test in this file legitimately uses
     * the stub for input/output assertions only.
     */
    function getRealMetadataCard(title: string): DebugElement {
      const match = fixture.debugElement
        .queryAll(By.directive(ProjectDashboardCardComponent))
        .find(element => (element.componentInstance as ProjectDashboardCardComponent).title() === title);
      if (!match) {
        throw new Error(`No real card found for title "${title}"`);
      }
      return match;
    }

    async function setupBoundaryFixture(): Promise<void> {
      await setup('C-1', {
        renderRealCards: true,
        indicators: [BAND_INDICATOR_FIXTURES.innovationDevelopment, BAND_INDICATOR_FIXTURES.policyChange]
      });
      applyFixtureToReportsMock(reportsMock, mockContractFullReports());
      fixture.detectChanges();
    }

    it('renders a working toggle for the 10-category Current Readiness card (> 5), with correct aria-expanded, and the host handles expandToggled', async () => {
      await setupBoundaryFixture();

      const toggleBefore = (getRealMetadataCard('Current Readiness').nativeElement as HTMLElement).querySelector(
        'button[aria-expanded]'
      );
      expect(toggleBefore).not.toBeNull();
      expect(toggleBefore!.getAttribute('aria-expanded')).toBe('false');

      (toggleBefore as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(component.expandedMetadataCards().has('innovation_readiness')).toBe(true);
      const toggleAfter = (getRealMetadataCard('Current Readiness').nativeElement as HTMLElement).querySelector(
        'button[aria-expanded]'
      );
      expect(toggleAfter!.getAttribute('aria-expanded')).toBe('true');
    });

    it('renders no toggle for the exactly-5-category Policy Type card -- the absent direction DC-13 requires', async () => {
      await setupBoundaryFixture();

      const toggle = (getRealMetadataCard('Policy Type').nativeElement as HTMLElement).querySelector(
        'button[aria-expanded]'
      );
      expect(toggle).toBeNull();
    });
  });

  describe('Indicator metadata — loading, error and retry across all 10 cards (R-IMC-011)', () => {
    it('shows the existing loading state on all 10 metadata cards while reports/full is in flight (AC.1)', async () => {
      await setupWithAllBandsAndFixture();

      reportsMock.loading.set(true);
      fixture.detectChanges();

      for (const title of METADATA_CARD_TITLES) {
        expect(getCardByTitle(title).loading).toBe(true);
      }
    });

    it('shows the existing error state on all 10 metadata cards on failure (AC.2)', async () => {
      await setupWithAllBandsAndFixture();

      reportsMock.loadError.set(true);
      fixture.detectChanges();

      for (const title of METADATA_CARD_TITLES) {
        expect(getCardByTitle(title).error).toBe(true);
      }
    });

    it('retries once and repopulates every band after a loadError -> update() cycle (AC.3)', async () => {
      const fixtureData = await setupWithAllBandsAndFixture();

      reportsMock.payload.set(null);
      reportsMock.loadError.set(true);
      fixture.detectChanges();

      // Fire the retry through the real seam bound on every metadata card
      // ((retry)="reports.update()", project-dashboard.component.html) --
      // ONE card's "Try again" click, not one per card.
      getCardByTitle('Current Readiness').retry.emit();
      fixture.detectChanges();

      expect(reportsMock.update).toHaveBeenCalledTimes(1);

      reportsMock.loadError.set(false);
      reportsMock.payload.set(fixtureData);
      fixture.detectChanges();

      for (const title of METADATA_CARD_TITLES) {
        const card = getCardByTitle(title);
        expect(card.error).toBe(false);
        expect(card.items.length).toBeGreaterThan(0);
      }
    });
  });

  /**
   * A-07.6 (owner-approved into T-08, 2026-07-30). Reviewer mutants M13/M14/M15
   * survived at 47/47 despite the DC-11 seam being asserted above: deleting
   * `(expandToggled)` from Primary Levers / Main contact person, or `(retry)`
   * from Primary Levers, left the whole suite green. The existing seam test
   * only ever toggles "Results Partners", so it structurally cannot catch a
   * dead binding on any of the other three cards. These loops close that gap
   * per-card rather than per-mechanism.
   */
  describe('per-card output-binding coverage (A-07.6)', () => {
    const CARDS: ReadonlyArray<{ title: string; key: ChartKey }> = [
      { title: 'Results Partners', key: 'partners' },
      { title: 'Primary Levers', key: 'levers' },
      { title: 'Main contact person', key: 'contacts' },
      { title: 'Contributing projects', key: 'contributors' }
    ];

    for (const { title, key } of CARDS) {
      it(`should flip only the "${key}" chart key when "${title}" emits expandToggled, leaving the other three collapsed`, async () => {
        await setup();

        getCardByTitle(title).expandToggled.emit();
        fixture.detectChanges();

        expect(component.expanded()).toEqual(new Set([key]));
        for (const other of CARDS) {
          if (other.key !== key) {
            expect(component.expanded().has(other.key)).toBe(false);
          }
        }
      });
    }

    it('should call reports.update() once per card when each of the four cards emits retry, reaching a call count of 4', async () => {
      await setup();

      for (const { title } of CARDS) {
        getCardByTitle(title).retry.emit();
      }

      expect(reportsMock.update).toHaveBeenCalledTimes(4);
    });
  });

  describe('grounding and executive overview', () => {
    it('should format grounded docs badge for singular and plural counts', async () => {
      await setup();
      component.groundedDocuments.set([]);

      expect(component.groundedDocumentsCountColor()).toBe('#8D9299');

      component.groundedDocuments.set([{ fileName: 'a.pdf', fileKey: 'folder/a.pdf' }]);
      expect(component.groundedDocumentsCountColor()).toBe('#358540');
      expect(component.hasGroundedDocuments()).toBe(true);
      expect(component.canUploadMoreGroundingDocs()).toBe(true);

      component.groundedDocuments.set([
        { fileName: 'a.pdf', fileKey: 'folder/a.pdf' },
        { fileName: 'b.pdf', fileKey: 'folder/b.pdf' },
        { fileName: 'c.pdf', fileKey: 'folder/c.pdf' }
      ]);
      expect(component.groundedDocumentsCountColor()).toBe('#CF0808');
      expect(component.canUploadMoreGroundingDocs()).toBe(false);
    });

    it('should allow grounding setup only for center admin and system admin', async () => {
      await setup();

      expect(component.canAccessGroundingSetup()).toBe(true);
    });

    it('should hide grounding setup for non-admin users', async () => {
      await setup('C-1', { isAdmin: false });

      expect(component.canAccessGroundingSetup()).toBe(false);
    });

    it('should open the grounding setup modal for admin users', async () => {
      await setup();

      component.groundingText.set('Unsaved local text');
      component.groundedDocuments.set([{ fileName: 'local.pdf', fileKey: 'folder/local.pdf' }]);
      await component.openGroundingSetupModal();

      expect(documentOverviewServiceMock.fetchDocumentOverviewSummary).toHaveBeenLastCalledWith('C-1');
      expect(component.groundingText()).toBe('');
      expect(component.groundedDocuments()).toEqual([
        {
          fileName: 'stored-file.pdf',
          fileKey: 'star/ai-insights/test/project-overview/projects/C-1/stored-file.pdf'
        }
      ]);
      expect(allModalsServiceMock.openModal).toHaveBeenCalledWith('projectGroundingSetup');
      expect(allModalsServiceMock.setModalWidth).toHaveBeenCalledWith('projectGroundingSetup', true);
    });

    it('should not open the grounding setup modal for non-admin users', async () => {
      await setup('C-1', { isAdmin: false });

      await component.openGroundingSetupModal();

      expect(allModalsServiceMock.openModal).not.toHaveBeenCalled();
    });

    it('should not open the modal when saved grounding resources cannot be loaded', async () => {
      await setup();
      documentOverviewServiceMock.fetchDocumentOverviewSummary.mockRejectedValueOnce(new Error('fetch failed'));

      await component.openGroundingSetupModal();

      expect(allModalsServiceMock.openModal).not.toHaveBeenCalled();
      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', summary: 'Unable to open setup' })
      );
    });

    it('should load stored executive overview summary and documents on dashboard init', async () => {
      await setup();

      expect(documentOverviewServiceMock.fetchDocumentOverviewSummary).toHaveBeenCalledWith('C-1');
      expect(documentOverviewServiceMock.generateDocumentOverview).not.toHaveBeenCalled();
      expect(component.executiveOverviewParagraphs()).toEqual(['Stored overview paragraph.', 'Second stored paragraph.']);
      expect(component.groundedDocuments()).toEqual([
        {
          fileName: 'stored-file.pdf',
          fileKey: 'star/ai-insights/test/project-overview/projects/C-1/stored-file.pdf'
        }
      ]);
      expect(component.overviewSourceDocuments()).toEqual([
        {
          fileName: 'stored-file.pdf',
          fileKey: 'star/ai-insights/test/project-overview/projects/C-1/stored-file.pdf'
        }
      ]);
      expect(component.executiveOverviewGeneratedAt()).toBe('2026-07-09T20:10:56.921192+00:00');
      expect(component.showExecutiveOverview()).toBe(true);
    });

    it('should expand and collapse the executive overview', async () => {
      await setup();

      expect(component.executiveOverviewExpanded()).toBe(false);
      expect(component.executiveOverviewText()).toBe('Stored overview paragraph.\n\nSecond stored paragraph.');

      component.toggleExecutiveOverview();
      expect(component.executiveOverviewExpanded()).toBe(true);

      component.toggleExecutiveOverview();
      expect(component.executiveOverviewExpanded()).toBe(false);
    });

    it('should load executive overview summary for non-admin users when data exists', async () => {
      await setup('C-1', { isAdmin: false });

      expect(documentOverviewServiceMock.fetchDocumentOverviewSummary).toHaveBeenCalledWith('C-1');
      expect(component.canAccessGroundingSetup()).toBe(false);
      expect(component.executiveOverviewParagraphs()).toEqual(['Stored overview paragraph.', 'Second stored paragraph.']);
      expect(component.showExecutiveOverview()).toBe(true);
    });

    it('should auto-generate a baseline overview on entry when no summary exists', async () => {
      await setup('C-1', { emptyOverview: true });
      // The auto-call awaits the fetch, then the generation — flush the extra async level.
      await new Promise(resolve => setTimeout(resolve, 0));
      fixture.detectChanges();

      expect(documentOverviewServiceMock.fetchDocumentOverviewSummary).toHaveBeenCalledWith('C-1');
      // Baseline auto-call sends no documents or text — just the project id.
      expect(documentOverviewServiceMock.generateDocumentOverview).toHaveBeenCalledWith('C-1');
      expect(component.executiveOverviewParagraphs()).toEqual(['First overview paragraph.', 'Second overview paragraph.']);
      expect(component.showExecutiveOverview()).toBe(true);
      expect(component.executiveOverviewLoading()).toBe(false);
    });

    it('should surface the executive overview for non-admin users after the baseline auto-generation', async () => {
      await setup('C-1', { isAdmin: false, emptyOverview: true });
      await new Promise(resolve => setTimeout(resolve, 0));
      fixture.detectChanges();

      expect(documentOverviewServiceMock.generateDocumentOverview).toHaveBeenCalledWith('C-1');
      expect(component.canAccessGroundingSetup()).toBe(false);
      expect(component.showExecutiveOverview()).toBe(true);
    });

    it('should not auto-generate a baseline overview when a stored summary already exists', async () => {
      await setup();

      expect(documentOverviewServiceMock.generateDocumentOverview).not.toHaveBeenCalled();
    });

    it('should block grounding upload actions for non-admin users', async () => {
      await setup('C-1', { isAdmin: false });
      const fileInput = document.createElement('input');
      const clickSpy = jest.spyOn(fileInput, 'click');

      component.triggerGroundingUpload(fileInput);
      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('contract.pdf')])
      } as unknown as Event);
      await component.generateExecutiveOverview();

      expect(clickSpy).not.toHaveBeenCalled();
      expect(fileManagerServiceMock.uploadFile).not.toHaveBeenCalled();
      expect(documentOverviewServiceMock.generateDocumentOverview).not.toHaveBeenCalled();
    });

    it('should upload grounding files without generating executive overview', async () => {
      await setup();
      component.groundedDocuments.set([]);
      documentOverviewServiceMock.fetchDocumentOverviewSummary.mockClear();

      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('contract.pdf')])
      } as unknown as Event);

      expect(fileManagerServiceMock.uploadFile).toHaveBeenCalledTimes(1);
      expect(documentOverviewServiceMock.generateDocumentOverview).not.toHaveBeenCalled();
      expect(component.groundedDocuments()).toEqual([
        {
          fileName: 'contract.pdf',
          fileKey: expect.stringContaining('stored-file.pdf')
        }
      ]);
      expect(component.uploadingGroundingDoc()).toBe(false);
    });

    it('should generate executive overview when generate is clicked', async () => {
      await setup();
      component.groundedDocuments.set([{ fileName: 'contract.pdf', fileKey: 'folder/contract.pdf' }]);
      documentOverviewServiceMock.generateDocumentOverview.mockClear();

      await component.generateExecutiveOverview();

      expect(documentOverviewServiceMock.generateDocumentOverview).toHaveBeenCalledWith('C-1');
      expect(fileManagerServiceMock.uploadFile).not.toHaveBeenCalled();
      expect(component.executiveOverviewParagraphs()).toEqual(['First overview paragraph.', 'Second overview paragraph.']);
      expect(component.groundedDocuments()).toEqual([
        {
          fileName: 'contract.pdf',
          fileKey: 'star/ai-insights/test/project-overview/projects/C-1/stored-file.pdf'
        }
      ]);
      expect(component.overviewSourceDocuments()).toEqual([
        {
          fileName: 'contract.pdf',
          fileKey: 'star/ai-insights/test/project-overview/projects/C-1/stored-file.pdf'
        }
      ]);
      expect(component.executiveOverviewGeneratedAt()).toBe('2026-07-10T14:05:25.094Z');
      expect(component.executiveOverviewLoading()).toBe(false);
      expect(component.executiveOverviewError()).toBe(false);
    });

    it('should set executive overview error when document overview generation fails', async () => {
      await setup();
      component.groundedDocuments.set([{ fileName: 'contract.pdf', fileKey: 'folder/contract.pdf' }]);
      documentOverviewServiceMock.generateDocumentOverview.mockRejectedValueOnce(new Error('overview failed'));

      await component.generateExecutiveOverview();

      expect(component.executiveOverviewError()).toBe(true);
      expect(component.executiveOverviewLoading()).toBe(false);
    });

    it('should skip executive overview generation when contract id is missing', async () => {
      await setup(null);
      component.groundedDocuments.set([{ fileName: 'a.pdf', fileKey: 'folder/a.pdf' }]);
      documentOverviewServiceMock.generateDocumentOverview.mockClear();

      await component.generateExecutiveOverview();

      expect(documentOverviewServiceMock.generateDocumentOverview).not.toHaveBeenCalled();
    });

    it('should show a confirmation modal before removing a grounded document', async () => {
      await setup();
      component.groundedDocuments.set([
        { fileName: 'a.pdf', fileKey: 'folder/a.pdf' },
        { fileName: 'b.pdf', fileKey: 'folder/b.pdf' }
      ]);
      component.executiveOverviewParagraphs.set(['Existing overview']);
      component.executiveOverviewGeneratedAt.set('2026-07-09T20:10:56.921192+00:00');
      component.overviewSourceDocuments.set([{ fileName: 'a.pdf', fileKey: 'folder/a.pdf' }]);

      component.removeGroundingDocument('folder/a.pdf');

      expect(actionsServiceMock.showGlobalAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'warning',
          summary: 'Remove document',
          icon: 'pi pi-exclamation-triangle',
          color: '#E69F00',
          confirmCallback: expect.objectContaining({ label: 'Continue' }),
          cancelCallback: expect.objectContaining({ label: 'Cancel' })
        })
      );
      expect(documentOverviewServiceMock.deleteDocumentOverviewFiles).not.toHaveBeenCalled();
    });

    it('should remove a grounded document from the list after confirmation', async () => {
      await setup();
      component.groundedDocuments.set([
        { fileName: 'a.pdf', fileKey: 'folder/a.pdf' },
        { fileName: 'b.pdf', fileKey: 'folder/b.pdf' }
      ]);
      component.executiveOverviewParagraphs.set(['Existing overview']);
      component.executiveOverviewGeneratedAt.set('2026-07-09T20:10:56.921192+00:00');
      component.overviewSourceDocuments.set([{ fileName: 'a.pdf', fileKey: 'folder/a.pdf' }]);

      component.removeGroundingDocument('folder/a.pdf');
      const alertConfig = actionsServiceMock.showGlobalAlert.mock.calls[0][0];
      await alertConfig.confirmCallback.event();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(documentOverviewServiceMock.deleteDocumentOverviewFiles).toHaveBeenCalledWith('C-1', ['a.pdf']);
      expect(component.groundedDocuments()).toEqual([{ fileName: 'b.pdf', fileKey: 'folder/b.pdf' }]);
      expect(component.executiveOverviewParagraphs()).toEqual(['Existing overview']);
      expect(component.executiveOverviewGeneratedAt()).toBe('2026-07-09T20:10:56.921192+00:00');
      expect(component.overviewSourceDocuments()).toEqual([{ fileName: 'a.pdf', fileKey: 'folder/a.pdf' }]);
    });

    it('should keep the grounded document when delete request fails', async () => {
      await setup();
      documentOverviewServiceMock.deleteDocumentOverviewFiles.mockRejectedValueOnce(new Error('delete failed'));
      component.groundedDocuments.set([
        { fileName: 'a.pdf', fileKey: 'folder/a.pdf' },
        { fileName: 'b.pdf', fileKey: 'folder/b.pdf' }
      ]);

      component.removeGroundingDocument('folder/a.pdf');
      const alertConfig = actionsServiceMock.showGlobalAlert.mock.calls[0][0];
      await alertConfig.confirmCallback.event();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'Remove failed'
        })
      );
      expect(component.groundedDocuments()).toEqual([
        { fileName: 'a.pdf', fileKey: 'folder/a.pdf' },
        { fileName: 'b.pdf', fileKey: 'folder/b.pdf' }
      ]);
    });

    it('should trigger grounding upload when slots are available', async () => {
      await setup();
      const fileInput = document.createElement('input');
      const clickSpy = jest.spyOn(fileInput, 'click');

      component.triggerGroundingUpload(fileInput);

      expect(fileInput.value).toBe('');
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should not trigger grounding upload when limit reached or upload in progress', async () => {
      await setup();
      const fileInput = document.createElement('input');
      const clickSpy = jest.spyOn(fileInput, 'click');

      component.groundedDocuments.set([
        { fileName: 'a.pdf', fileKey: 'folder/a.pdf' },
        { fileName: 'b.pdf', fileKey: 'folder/b.pdf' },
        { fileName: 'c.pdf', fileKey: 'folder/c.pdf' }
      ]);
      component.triggerGroundingUpload(fileInput);
      expect(clickSpy).not.toHaveBeenCalled();

      component.groundedDocuments.set([]);
      component.uploadingGroundingDoc.set(true);
      component.triggerGroundingUpload(fileInput);
      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('should ignore empty file selection', async () => {
      await setup();

      await component.onGroundingFilesSelected({ target: createFileInput([]) } as unknown as Event);

      expect(fileManagerServiceMock.uploadFile).not.toHaveBeenCalled();
    });

    it('should warn when upload limit is already reached', async () => {
      await setup();
      component.groundedDocuments.set([
        { fileName: 'a.pdf', fileKey: 'folder/a.pdf' },
        { fileName: 'b.pdf', fileKey: 'folder/b.pdf' },
        { fileName: 'c.pdf', fileKey: 'folder/c.pdf' }
      ]);

      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('extra.pdf')])
      } as unknown as Event);

      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warning', summary: 'Upload limit reached' }));
      expect(fileManagerServiceMock.uploadFile).not.toHaveBeenCalled();
    });

    it('should upload valid grounding files and pass project id to file manager', async () => {
      await setup();
      component.groundedDocuments.set([]);

      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('contract.pdf'), createFile('scope.docx')])
      } as unknown as Event);

      expect(fileManagerServiceMock.uploadFile).toHaveBeenCalledTimes(2);
      expect(fileManagerServiceMock.uploadFile).toHaveBeenCalledWith(expect.objectContaining({ name: 'contract.pdf' }), 10, 100, {
        projectId: 'C-1'
      });
      expect(component.groundedDocuments()).toEqual([
        { fileName: 'contract.pdf', fileKey: expect.stringContaining('stored-file.pdf') },
        { fileName: 'scope.docx', fileKey: expect.stringContaining('stored-file.pdf') }
      ]);
      expect(component.uploadingGroundingDoc()).toBe(false);
    });

    it('should trim selected files to remaining slots and show singular limit toast', async () => {
      await setup();
      component.groundedDocuments.set([
        { fileName: 'a.pdf', fileKey: 'folder/a.pdf' },
        { fileName: 'b.pdf', fileKey: 'folder/b.pdf' }
      ]);

      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('one.pdf'), createFile('two.pdf')])
      } as unknown as Event);

      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'info',
          detail: 'Only 1 more document can be uploaded.'
        })
      );
      expect(fileManagerServiceMock.uploadFile).toHaveBeenCalledTimes(1);
    });

    it('should reject unsupported and oversized grounding files', async () => {
      await setup();

      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('bad.exe'), createFile('huge.pdf', 11 * 1024 * 1024)])
      } as unknown as Event);

      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warning', summary: 'Unsupported file' }));
      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warning', summary: 'File too large' }));
      expect(fileManagerServiceMock.uploadFile).not.toHaveBeenCalled();
    });

    it('should show plural limit toast when multiple slots remain', async () => {
      await setup();
      component.groundedDocuments.set([{ fileName: 'a.pdf', fileKey: 'folder/a.pdf' }]);

      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('one.pdf'), createFile('two.pdf'), createFile('three.pdf')])
      } as unknown as Event);

      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'info',
          detail: 'Only 2 more documents can be uploaded.'
        })
      );
    });

    it('should handle file inputs without a files collection', async () => {
      await setup();
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', { value: null });

      await component.onGroundingFilesSelected({ target: input } as unknown as Event);

      expect(fileManagerServiceMock.uploadFile).not.toHaveBeenCalled();
    });

    it('should treat files without an extension as unsupported', async () => {
      await setup();
      const splitSpy = jest.spyOn(String.prototype, 'split').mockReturnValueOnce([] as unknown as string[]);

      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('no-extension')])
      } as unknown as Event);

      expect(splitSpy).toHaveBeenCalled();
      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warning', summary: 'Unsupported file' }));
      splitSpy.mockRestore();
    });

    it('should show error toast when upload fails or filename is missing', async () => {
      await setup();

      fileManagerServiceMock.uploadFile.mockRejectedValueOnce(new Error('upload failed'));
      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('fail.pdf')])
      } as unknown as Event);
      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', summary: 'Upload failed' }));

      fileManagerServiceMock.uploadFile.mockResolvedValueOnce({ data: { filename: '' } });
      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('missing-name.pdf')])
      } as unknown as Event);
      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', summary: 'Upload failed' }));
    });

    it('should skip remove confirmation for non-admin users', async () => {
      await setup('C-1', { isAdmin: false });
      component.groundedDocuments.set([{ fileName: 'a.pdf', fileKey: 'folder/a.pdf' }]);

      component.removeGroundingDocument('folder/a.pdf');

      expect(actionsServiceMock.showGlobalAlert).not.toHaveBeenCalled();
    });

    it('should skip remove confirmation when the document does not exist', async () => {
      await setup();

      component.removeGroundingDocument('missing-key');

      expect(actionsServiceMock.showGlobalAlert).not.toHaveBeenCalled();
    });

    it('should skip async document removal when project id is missing', async () => {
      await setup(null);
      component.groundedDocuments.set([{ fileName: 'a.pdf', fileKey: 'folder/a.pdf' }]);

      await (component as any).removeGroundingDocumentAsync('folder/a.pdf');

      expect(documentOverviewServiceMock.deleteDocumentOverviewFiles).not.toHaveBeenCalled();
    });

    it('should skip async document removal when document is no longer in the list', async () => {
      await setup();

      await (component as any).removeGroundingDocumentAsync('missing-key');

      expect(documentOverviewServiceMock.deleteDocumentOverviewFiles).not.toHaveBeenCalled();
    });

    it('should skip loading executive overview summary when project id is missing', async () => {
      await setup(null);
      documentOverviewServiceMock.fetchDocumentOverviewSummary.mockClear();

      await (component as any).loadExecutiveOverviewSummary();

      expect(documentOverviewServiceMock.fetchDocumentOverviewSummary).not.toHaveBeenCalled();
    });

    it('should clear executive overview when summary fetch fails', async () => {
      await setup('C-1', { rejectOverviewFetch: true });

      expect(component.executiveOverviewParagraphs()).toEqual([]);
      expect(component.groundedDocuments()).toEqual([]);
      expect(component.overviewSourceDocuments()).toEqual([]);
      expect(component.executiveOverviewGeneratedAt()).toBeNull();
      expect(component.executiveOverviewLoading()).toBe(false);
    });

    it('should not auto-generate a baseline overview when the summary fetch fails', async () => {
      await setup('C-1', { rejectOverviewFetch: true });

      expect(documentOverviewServiceMock.generateDocumentOverview).not.toHaveBeenCalled();
    });
  });

  describe('text contextual resource', () => {
    it('should load analyzed text as an editable text resource', async () => {
      await setup();

      (component as any).applyDocumentOverviewResponse({
        text: '  Analyzed project context.  ',
        available_files: [
          { file_name: 'a.pdf', file_key: 'folder/a.pdf' },
          { file_name: 'b.pdf', file_key: 'folder/b.pdf' }
        ]
      });

      expect(component.groundingText()).toBe('Analyzed project context.');
      expect(component.totalGroundingResources()).toBe(3);
      expect(component.canUploadMoreGroundingDocs()).toBe(false);

      component.openGroundingTextEditor();
      expect(component.showGroundingTextEditor()).toBe(true);
      expect(component.groundingTextDraft()).toBe('Analyzed project context.');

      component.groundingTextDraft.set('Updated project context.');
      component.saveGroundingText();
      expect(component.groundingText()).toBe('Updated project context.');
    });

    it('should leave the text field editable when the overview text is empty', async () => {
      await setup();

      (component as any).applyDocumentOverviewResponse({ text: '   ' });

      expect(component.hasGroundingText()).toBe(false);
      expect(component.canAddGroundingText()).toBe(true);
    });

    it('should save a trimmed text resource that counts toward the resource limit', async () => {
      await setup();
      component.groundedDocuments.set([]);

      component.openGroundingTextEditor();
      expect(component.showGroundingTextEditor()).toBe(true);

      component.groundingTextDraft.set('  Project context text.  ');
      component.saveGroundingText();

      expect(component.groundingText()).toBe('Project context text.');
      expect(component.hasGroundingText()).toBe(true);
      expect(component.showGroundingTextEditor()).toBe(false);
      expect(component.totalGroundingResources()).toBe(1);
      expect(component.hasGroundingResources()).toBe(true);
    });

    it('should cap the text draft input at 20,000 characters', async () => {
      await setup();

      component.onGroundingTextInput({ target: { value: 'x'.repeat(25_000) } } as unknown as Event);

      expect(component.groundingTextDraft().length).toBe(20_000);
    });

    it('should not save an empty or whitespace-only text resource', async () => {
      await setup();
      component.groundingTextDraft.set('   ');

      component.saveGroundingText();

      expect(component.hasGroundingText()).toBe(false);
    });

    it('should enforce a maximum of three resources across documents and text', async () => {
      await setup();
      component.groundedDocuments.set([
        { fileName: 'a.pdf', fileKey: 'folder/a.pdf' },
        { fileName: 'b.pdf', fileKey: 'folder/b.pdf' }
      ]);
      component.groundingText.set('A text resource.');

      expect(component.totalGroundingResources()).toBe(3);
      expect(component.canUploadMoreGroundingDocs()).toBe(false);
      expect(component.canAddGroundingText()).toBe(false);
      expect(component.groundedDocumentsCountColor()).toBe('#CF0808');
    });

    it('should only allow one text resource at a time', async () => {
      await setup();
      component.groundingText.set('Existing text.');

      expect(component.canAddGroundingText()).toBe(false);
    });

    it('should pass the text resource to the generation call', async () => {
      await setup();
      component.groundedDocuments.set([]);
      component.groundingText.set('Grounding context text.');
      documentOverviewServiceMock.generateDocumentOverview.mockClear();

      await component.generateExecutiveOverview();

      expect(documentOverviewServiceMock.generateDocumentOverview).toHaveBeenCalledWith('C-1', 'Grounding context text.');
    });

    it('should remove the text resource and reset the editor', async () => {
      await setup();
      component.groundingText.set('Text to remove.');
      component.showGroundingTextEditor.set(true);
      component.groundingTextDraft.set('Text to remove.');

      component.removeGroundingText();

      expect(component.hasGroundingText()).toBe(false);
      expect(component.showGroundingTextEditor()).toBe(false);
      expect(component.groundingTextDraft()).toBe('');
    });

    it('should cancel the text editor without saving', async () => {
      await setup();
      component.openGroundingTextEditor();
      component.groundingTextDraft.set('Unsaved text.');

      component.cancelGroundingText();

      expect(component.showGroundingTextEditor()).toBe(false);
      expect(component.groundingTextDraft()).toBe('');
      expect(component.hasGroundingText()).toBe(false);
    });

    it('should block text resource actions for non-admin users', async () => {
      await setup('C-1', { isAdmin: false });

      component.openGroundingTextEditor();
      expect(component.showGroundingTextEditor()).toBe(false);

      component.groundingTextDraft.set('Attempted text.');
      component.saveGroundingText();
      expect(component.hasGroundingText()).toBe(false);
    });
  });

  // ===========================================================================
  // T-12 — Shared-consumer isolation (NFR-RCU-005, requirements.md; design.md
  // §6.2). `initializeProjectDashboardResultsTable` (`:215`) is the ONLY caller
  // of that service method (design.md's own consumer table), and this is the
  // spec design.md/tasks.md T-12 names by file+line as the place the guard is
  // proven. Every other `it` above uses `resultsCenterServiceMock` — a whole
  // mocked service (KZ-001) that cannot observe URL leakage, because it has no
  // `router.navigate` to leak through in the first place. This block replaces
  // the mock with the REAL `ResultsCenterService` for exactly this purpose.
  //
  // The guarantee under test is NOT "userFilterMutations stays frozen" — design
  // .md §6.2's 2026-08-12 correction is explicit that a cross-route mutation
  // CAN move that counter (see `resetState()`/`clearAllFilters()` from
  // `project-detail.component.ts`). The guarantee is structural: the URL write
  // effect lives only in `ResultsCenterComponent`'s injector, and
  // `ResultsCenterComponent` is never instantiated on this route, so
  // `router.navigate` must be zero regardless of what the counter does.
  //
  // Rework attempt 2 (NFR-RCU-005 reliability fix): `setupWithRealResultsCenterService`
  // already flushes root effects (`detectChanges` / `whenStable` / `detectChanges`
  // — the ONLY block of the four that did before this rework), so a relocated
  // `urlWriteEffect` sitting on the root-provided `ResultsCenterService` would
  // actually run before the assertion below reads `navigateSpy`. A second,
  // explicit `TestBed.flushEffects()` is added purely for symmetry/documentation
  // with the other three blocks, not because this one was missing a flush point.
  // Which mutant variant this block can and cannot catch (verified with the
  // Reviewer's structural mutant, reverted after proof — see task report):
  //   - COUNTER-GATED variant (`effect(() => { userFilterMutations(); navigate([]); })`):
  //     stays GREEN here. `initializeProjectDashboardResultsTable` (results-center
  //     .service.ts:848-879) never bumps `userFilterMutations` by design (design.md
  //     §6.2's own table lists it under "does NOT increment") — the counter never
  //     moves, so the mutant effect never fires. That is production's actual
  //     contract, not a hole in this test.
  //   - UNCONDITIONAL/state-watching variant (`effect(() => { resultsFilter(); navigate([]); })`):
  //     goes RED here, because `resultsFilter` IS written by the fixed-table seed
  //     and the flush above lets that effect run.
  // ===========================================================================
  describe('shared-consumer isolation (NFR-RCU-005, T-12, real ResultsCenterService)', () => {
    let realResultsCenterService: ResultsCenterService;
    let navigateSpy: jest.Mock;

    async function setupWithRealResultsCenterService(): Promise<void> {
      // Minimal doubles for ResultsCenterService's OWN dependencies — not the
      // component's. `indicatorTabs.lazy()` backs the service's self-
      // destroying `onChangeList` effect (results-center.service.ts:418);
      // without it the effect throws on construction.
      const indicatorTabsListSignal = signal<any[]>([]);
      const sharedApiMock = {
        GET_ResultsCount: jest.fn().mockResolvedValue({ data: {} }),
        GET_Results: jest.fn().mockResolvedValue({ data: { results: [] } }),
        indicatorTabs: {
          lazy: jest.fn().mockReturnValue({
            isLoading: signal(false),
            hasValue: signal(false),
            list: indicatorTabsListSignal
          })
        }
      } as unknown as jest.Mocked<ApiService>;
      const getResultsServiceMock = { fetchPaginated: jest.fn().mockResolvedValue({ results: [], total: 0 }) };
      const cacheServiceMock = { dataCache: signal({ user: { sec_user_id: 1 } }) } as unknown as jest.Mocked<CacheService>;
      navigateSpy = jest.fn().mockResolvedValue(true);
      const routerMock = { navigate: navigateSpy } as unknown as jest.Mocked<Router>;

      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [ProjectDashboardComponent],
        providers: [
          // REAL service — explicitly listed (not `useValue`) so DI
          // constructs an actual instance, mirroring the T-11 exemplar's
          // technique for the same class (results-center.component.spec.ts).
          ResultsCenterService,
          { provide: ActivatedRoute, useValue: { parent: { snapshot: { paramMap: convertToParamMap({ id: 'C-1' }) } } } },
          { provide: ApiService, useValue: sharedApiMock },
          { provide: GetResultsService, useValue: getResultsServiceMock },
          { provide: CacheService, useValue: cacheServiceMock },
          { provide: Router, useValue: routerMock },
          { provide: ProjectUtilsService, useValue: { getLeverName: jest.fn(), sortIndicators: jest.fn((items: any[]) => items) } },
          { provide: FileManagerService, useValue: { uploadFile: jest.fn() } },
          { provide: DocumentOverviewService, useValue: { fetchDocumentOverviewSummary: jest.fn().mockResolvedValue({}), generateDocumentOverview: jest.fn(), deleteDocumentOverviewFiles: jest.fn() } },
          { provide: RolesService, useValue: { isAdmin: jest.fn().mockReturnValue(false) } },
          { provide: ActionsService, useValue: { showToast: jest.fn(), showGlobalAlert: jest.fn() } }
        ]
      })
        .overrideComponent(ProjectDashboardComponent, {
          remove: {
            imports: [ProjectDashboardCardComponent, GeoScopeCardComponent, ResultsCenterTableComponent],
            providers: [GetFullContractReportsService, GetGeoScopeService]
          },
          add: {
            imports: [ProjectDashboardCardStubComponent, GeoScopeCardStubComponent, ResultsCenterTableStubComponent],
            providers: [
              { provide: GetFullContractReportsService, useValue: createReportsMock() },
              { provide: GetGeoScopeService, useValue: { main: jest.fn() } }
            ]
          }
        })
        .compileComponents();

      const dashboardFixture = TestBed.createComponent(ProjectDashboardComponent);
      realResultsCenterService = TestBed.inject(ResultsCenterService);
      dashboardFixture.detectChanges();
      await dashboardFixture.whenStable();
      dashboardFixture.detectChanges();
    }

    afterEach(() => {
      TestBed.resetTestingModule();
    });

    it('drives the fixed-table mutation on the REAL service and fires zero router.navigate', async () => {
      await setupWithRealResultsCenterService();

      // Explicit flush between the mutation (above, inside setup) and the
      // assertions below — see the block comment for which mutant variant
      // this can and cannot catch.
      TestBed.flushEffects();

      // Positive control — proves `initializeProjectDashboardResultsTable`
      // actually ran against the REAL service (not a spy on a mock that would
      // pass even if the production wiring were deleted): the fixed filter
      // (design.md's `status-codes: [5]`, "Pending Revision") is observably
      // set on the real signals.
      expect(realResultsCenterService.primaryContractId()).toBe('C-1');
      expect(realResultsCenterService.resultsFilter()['status-codes']).toEqual([5]);
      expect(realResultsCenterService.appliedFilters()['status-codes']).toEqual([5]);
      expect(realResultsCenterService.tableFilters().statusCodes).toEqual([{ result_status_id: 5, name: 'Pending Revision' }]);

      // Negative control — the actual guarantee under test. Nothing on this
      // route ever constructs `ResultsCenterComponent`, so its injector-scoped
      // write effect cannot exist here; this asserts that with a REAL,
      // observable Router double rather than assuming it from the absence of
      // a component.
      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });
});
