import { Component, DebugElement, EventEmitter, Input, Output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { By } from '@angular/platform-browser';
import { ApiService } from '@shared/services/api.service';
import { ProjectUtilsService } from '@shared/services/project-utils.service';
import { ResultsCenterService } from '../../../results-center/results-center.service';
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
import { ContractFullReports } from '@interfaces/contract-full-reports.interface';
import { mockContractFullReports } from 'src/app/testing/contract-full-reports.mock';

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
class GeoScopeCardStubComponent {}

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
      main: jest.fn(),
      update: jest.fn()
    };
  }

  /** Drives all four ranked sections of `reportsMock` from one `ContractFullReports` payload. */
  function applyFixtureToReportsMock(mock: ReturnType<typeof createReportsMock>, data: ContractFullReports): void {
    mock.payload.set(data);
    mock.topPartners.set(data.top_partners);
    mock.topPrimaryLevers.set(data.top_primary_levers);
    mock.topMainContactPersons.set(data.top_main_contact_persons);
    mock.topContributors.set(data.top_contributors);
    mock.staff.set(data.staff);
    mock.geoScope.set(data.geo_scope);
  }

  /** Every `app-project-dashboard-card` stub instance currently rendered by the host. */
  function getCardDebugElements(): DebugElement[] {
    return fixture.debugElement.queryAll(By.directive(ProjectDashboardCardStubComponent));
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
    options?: { isAdmin?: boolean; emptyOverview?: boolean; rejectOverviewFetch?: boolean }
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
    rolesServiceMock = { isAdmin: jest.fn().mockReturnValue(options?.isAdmin ?? true) };
    apiMock = {
      GET_ResultsCount: jest.fn().mockResolvedValue({
        data: {
          grant_amount: 1234,
          divisionId: 'D1',
          division: 'Division',
          unitId: 'U1',
          unit: 'Unit',
          indicators: [
            // T-13 (indicator-metadata-charts): id was `1` before this spec
            // existed. `1` is `CAPACITY_SHARING_INDICATOR_ID`
            // (star-pdf-report.util.ts), one of the four real band ids the
            // new Indicator-metadata section now keys off of
            // (indicator-metadata-bands.mapper.ts) — with `1`, this fixture
            // incidentally produced a real Capacity Sharing band (4 cards),
            // which broke every test asserting an exact card count/title
            // list below. Changed to `10`, an id no band definition uses, so
            // this fixture stays about the 4 ranked cards it was written for.
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
        { provide: ActionsService, useValue: actionsServiceMock }
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

    it('should load stored executive overview summary and documents on dashboard init', async () => {
      await setup();

      expect(documentOverviewServiceMock.fetchDocumentOverviewSummary).toHaveBeenCalledWith('C-1');
      expect(documentOverviewServiceMock.generateDocumentOverview).not.toHaveBeenCalled();
      expect(component.executiveOverviewParagraphs()).toEqual([
        'Stored overview paragraph.',
        'Second stored paragraph.'
      ]);
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

    it('should load executive overview summary for non-admin users when data exists', async () => {
      await setup('C-1', { isAdmin: false });

      expect(documentOverviewServiceMock.fetchDocumentOverviewSummary).toHaveBeenCalledWith('C-1');
      expect(component.canAccessGroundingSetup()).toBe(false);
      expect(component.executiveOverviewParagraphs()).toEqual([
        'Stored overview paragraph.',
        'Second stored paragraph.'
      ]);
      expect(component.showExecutiveOverview()).toBe(true);
    });

    it('should hide executive overview for non-admin users when no data exists', async () => {
      await setup('C-1', { isAdmin: false, emptyOverview: true });

      expect(documentOverviewServiceMock.fetchDocumentOverviewSummary).toHaveBeenCalledWith('C-1');
      expect(component.showExecutiveOverview()).toBe(false);
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
      expect(component.executiveOverviewParagraphs()).toEqual([
        'First overview paragraph.',
        'Second overview paragraph.'
      ]);
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

      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warning', summary: 'Upload limit reached' })
      );
      expect(fileManagerServiceMock.uploadFile).not.toHaveBeenCalled();
    });

    it('should upload valid grounding files and pass project id to file manager', async () => {
      await setup();
      component.groundedDocuments.set([]);

      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('contract.pdf'), createFile('scope.docx')])
      } as unknown as Event);

      expect(fileManagerServiceMock.uploadFile).toHaveBeenCalledTimes(2);
      expect(fileManagerServiceMock.uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'contract.pdf' }),
        10,
        100,
        { projectId: 'C-1' }
      );
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

      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warning', summary: 'Unsupported file' })
      );
      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warning', summary: 'File too large' })
      );
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
      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warning', summary: 'Unsupported file' })
      );
      splitSpy.mockRestore();
    });

    it('should show error toast when upload fails or filename is missing', async () => {
      await setup();

      fileManagerServiceMock.uploadFile.mockRejectedValueOnce(new Error('upload failed'));
      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('fail.pdf')])
      } as unknown as Event);
      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', summary: 'Upload failed' })
      );

      fileManagerServiceMock.uploadFile.mockResolvedValueOnce({ data: { filename: '' } });
      await component.onGroundingFilesSelected({
        target: createFileInput([createFile('missing-name.pdf')])
      } as unknown as Event);
      expect(actionsServiceMock.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', summary: 'Upload failed' })
      );
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
  });
});
