import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';

import AllianceAlignmentComponent from './alliance-alignment.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../../../../shared/services/api.service';
import { CacheService } from '../../../../../../shared/services/cache/cache.service';
import { ActionsService } from '../../../../../../shared/services/actions.service';
import { SubmissionService } from '@shared/services/submission.service';
import { VersionWatcherService } from '@shared/services/version-watcher.service';
import { GetContractsService } from '@services/control-list/get-contracts.service';
import { GetLeversService } from '@services/control-list/get-levers.service';
import { GetStrategicObjectivesService } from '@services/control-list/get-strategic-objectives.service';
import { GetImpactOutcomesService } from '@services/control-list/get-impact-outcomes.service';
import { GetSdgsService } from '@services/control-list/get-sdgs.service';
import { GetLeverSdgTargetsService } from '@services/control-list/get-lever-sdg-targets.service';
import { MultiselectComponent } from '@shared/components/custom-fields/multiselect/multiselect.component';
import { AllianceLeverCardComponent } from './components/alliance-lever-card/alliance-lever-card.component';

class ApiServiceMock {
  GET_Alignments = jest.fn();
  PATCH_Alignments = jest.fn();
  GET_Levers = jest.fn();
}
class CacheServiceMock {
  metadata = signal<Record<string, unknown>>({ indicator_id: 5 });
  currentResultId = jest.fn().mockReturnValue(1);
  getCurrentNumericResultId = jest.fn().mockReturnValue(1);
  currentResultIndicatorSectionPath = jest.fn().mockReturnValue('next-section');
  currentMetadata() {
    return this.metadata();
  }
  currentResultIsLoading = jest.fn().mockReturnValue(false);
  showSectionHeaderActions = jest.fn().mockReturnValue(false);
  hasSmallScreen = jest.fn().mockReturnValue(false);
  isSidebarCollapsed = jest.fn().mockReturnValue(false);
}
class ActionsServiceMock {
  showToast = jest.fn();
  saveCurrentSection = jest.fn();
}
class RouterMock {
  navigate = jest.fn();
}
class SubmissionServiceMock {
  isEditableStatus = jest.fn().mockReturnValue(true);
}
class VersionWatcherServiceMock {
  onVersionChange = jest.fn();
}
class GetContractsServiceMock {
  private readonly catalog = signal<Record<string, unknown>[]>([]);
  list = jest.fn().mockReturnValue([]);
  loading = jest.fn().mockReturnValue(false);
  isOpenSearch = jest.fn().mockReturnValue(false);
  main = jest.fn().mockImplementation(async () => undefined);
  getList = jest.fn().mockImplementation(() => this.catalog);
  setCatalog(items: Record<string, unknown>[]) {
    this.catalog.set(items);
  }
}

class PortfolioCatalogServiceMock {
  private readonly catalog = signal<unknown[]>([]);
  list = this.catalog;
  loading = signal(false);
  isOpenSearch = signal(false);
  main = jest.fn().mockImplementation(async () => undefined);
  getList = jest.fn().mockImplementation(() => this.catalog);
  getLoading = jest.fn().mockImplementation(() => this.loading);
  setCatalog(items: unknown[]) {
    this.catalog.set(items);
  }
}

class GetLeverSdgTargetsServiceMock {
  private readonly catalog = signal<unknown[]>([]);
  list = this.catalog;
  loading = signal(false);
  isOpenSearch = jest.fn().mockReturnValue(false);
  main = jest.fn().mockImplementation(async () => undefined);
  getList = jest.fn().mockImplementation(() => this.catalog);
  getLoading = jest.fn().mockImplementation(() => this.loading);
  setCatalog(items: unknown[]) {
    this.catalog.set(items);
  }
}

const defaultLeversCatalog = [
  { id: 9, lever_id: 9, name: 'Other', short_name: 'Other', full_name: 'Other', other_names: 'Other' }
];

describe('AllianceAlignmentComponent', () => {
  let component: AllianceAlignmentComponent;
  let fixture: ComponentFixture<AllianceAlignmentComponent>;
  let api: ApiServiceMock;
  let cache: CacheServiceMock;
  let actions: ActionsServiceMock;
  let router: RouterMock;
  let submission: SubmissionServiceMock;
  let getContractsService: GetContractsServiceMock;
  let getLeversService: PortfolioCatalogServiceMock;
  let getStrategicObjectivesService: PortfolioCatalogServiceMock;
  let getImpactOutcomesService: PortfolioCatalogServiceMock;
  let getSdgsService: PortfolioCatalogServiceMock;
  let getLeverSdgTargetsService: GetLeverSdgTargetsServiceMock;
  let route: any;

  beforeEach(async () => {
    api = new ApiServiceMock();
    cache = new CacheServiceMock();
    actions = new ActionsServiceMock();
    router = new RouterMock();
    submission = new SubmissionServiceMock();
    getContractsService = new GetContractsServiceMock();
    getLeversService = new PortfolioCatalogServiceMock();
    getStrategicObjectivesService = new PortfolioCatalogServiceMock();
    getImpactOutcomesService = new PortfolioCatalogServiceMock();
    getSdgsService = new PortfolioCatalogServiceMock();
    getLeverSdgTargetsService = new GetLeverSdgTargetsServiceMock();
    getLeversService.setCatalog(defaultLeversCatalog);
    route = {
      snapshot: {
        paramMap: { get: (k: string) => (k === 'id' ? '1' : null) },
        queryParamMap: { get: (k: string) => (k === 'version' ? 'v1' : null) }
      }
    };

    // Mock GET_Alignments before component creation to avoid constructor error
    api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [], primary_levers: [], contributor_levers: [] } });
    api.GET_Levers.mockResolvedValue({
      data: [{ id: 9, name: 'Other', short_name: 'Other', full_name: 'Other', other_names: 'Other' }]
    });

    await TestBed.configureTestingModule({
      imports: [AllianceAlignmentComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: api },
        { provide: CacheService, useValue: cache },
        { provide: ActionsService, useValue: actions },
        { provide: Router, useValue: router },
        { provide: SubmissionService, useValue: submission },
        { provide: VersionWatcherService, useClass: VersionWatcherServiceMock },
        { provide: ActivatedRoute, useValue: route },
        { provide: GetContractsService, useValue: getContractsService },
        { provide: GetLeversService, useValue: getLeversService },
        { provide: GetStrategicObjectivesService, useValue: getStrategicObjectivesService },
        { provide: GetImpactOutcomesService, useValue: getImpactOutcomesService },
        { provide: GetSdgsService, useValue: getSdgsService },
        { provide: GetLeverSdgTargetsService, useValue: getLeverSdgTargetsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AllianceAlignmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call getData and set body', async () => {
    api.GET_Alignments.mockResolvedValue({
      data: { contracts: [{ is_primary: false, is_active: true, result_contract_id: 1, result_id: 1, contract_id: '1', contract_role_id: 1 }] }
    });
    await component.getData();
    expect(api.GET_Alignments).toHaveBeenCalledWith(1, { return: true });
    expect(component.body().contracts[0].contract_id).toBe('1');
  });

  it('should handle getData with empty response', async () => {
    api.GET_Alignments.mockResolvedValue({ data: {} });
    await component.getData();
    expect(component.body()).toEqual(expect.objectContaining({
      contracts: [],
      result_sdgs: [],
      primary_levers: [],
      contributor_levers: [],
      research_areas: [],
      strategic_objectives: [],
      impact_outcomes: []
    }));
  });

  it('should use P2 portfolio alignment only when portfolio id is 2', () => {
    cache.metadata.set({ indicator_id: 4, portfolio_id: 2 });
    expect(component.isPortfolioP2Alignment()).toBe(true);
    expect(component.leverServiceParams()).toEqual({ portfolioId: 2 });

    cache.metadata.set({ indicator_id: 4, portfolio: { id: 2, name: 'Portfolio 2' } });
    expect(component.isPortfolioP2Alignment()).toBe(true);
    expect(component.leverServiceParams()).toEqual({ portfolioId: 2 });
  });

  it('should keep P1 legacy alignment when portfolio id is not 2', () => {
    cache.metadata.set({ indicator_id: 4, portafolio_id: 1 });
    expect(component.isPortfolioP2Alignment()).toBe(false);
    expect(component.leverServiceParams()).toEqual({ portfolioId: 1 });
    expect(component.alignmentRequestParams()).toEqual({ portfolioId: 1, return: true });
  });

  it('should load portfolio 2 GET link-only contracts enriched for multiselect display', async () => {
    cache.metadata.set({ indicator_id: 1, portfolio_id: 2 });
    getContractsService.setCatalog([
      {
        agreement_id: 'A1048',
        description: 'Project A1048',
        contract_id: 'A1048',
        select_label: 'A1048 - Project A1048',
        project_lead_description: 'Lead',
        start_date: '2024-01-01',
        endDateGlobal: '2025-01-01'
      }
    ]);
    api.GET_Alignments.mockResolvedValue({
      data: {
        contracts: [
          {
            created_at: '2026-01-21T13:06:55.836Z',
            updated_at: '2026-06-30T21:38:49.000Z',
            is_active: true,
            result_contract_id: 11085,
            result_id: 8579,
            contract_id: 'A1048',
            contract_role_id: 1,
            is_primary: true
          }
        ],
        result_sdgs: [],
        research_areas: [],
        strategic_objectives: [],
        impact_outcomes: []
      }
    });

    await component.getData();

    expect(getLeversService.main).toHaveBeenCalledWith({ portfolioId: 2 });
    expect(component.body().contracts[0].agreement_id).toBe('A1048');
    expect(component.body().contracts[0].description).toBe('Project A1048');
    expect(component.body().contracts[0].select_label).toBe('A1048 - Project A1048');
    expect(component.body().research_areas).toEqual([]);
    expect(component.body().strategic_objectives).toEqual([]);
    expect(component.body().impact_outcomes).toEqual([]);
  });

  it('should load and save portfolio 2 alignment with portfolio-specific payload', async () => {
    cache.metadata.set({ indicator_id: 4, portfolio_id: 2 });
    getContractsService.setCatalog([
      {
        agreement_id: 'abc',
        description: 'Project ABC',
        contract_id: 'abc',
        select_label: 'abc - Project ABC',
        project_lead_description: 'Lead',
        start_date: '2024-01-01',
        endDateGlobal: '2025-01-01'
      }
    ]);
    api.GET_Alignments.mockResolvedValue({
      data: {
        contracts: [{ contract_id: 'abc', is_primary: true }],
        result_sdgs: [{ clarisa_sdg_id: 2, id: 2 }],
        research_areas: [{ lever_id: '42', full_name: 'Area 42' }],
        strategic_objectives: [{ strategic_objective_id: 3, name: 'SO 3' }],
        impact_outcomes: [{ impact_outcome_id: 5, name: 'IO 5' }],
        primary_levers: [{ lever_id: 1 }],
        contributor_levers: [{ lever_id: 2 }]
      }
    });

    await component.getData();

    expect(getContractsService.main).toHaveBeenCalled();
    expect(api.GET_Alignments).toHaveBeenCalledWith(1, { portfolioId: 2, return: true });
    expect(component.body().primary_levers).toEqual([]);
    expect(component.body().contributor_levers).toEqual([]);
    expect(component.body().contracts[0].agreement_id).toBe('abc');
    expect(component.body().contracts[0].description).toBe('Project ABC');
    expect(component.body().contracts[0].select_label).toBe('abc - Project ABC');
    expect(component.body().research_areas[0].lever_id).toBe(42);
    expect(component.body().strategic_objectives[0].id).toBe(3);

    api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
    component.body.update(current => ({
      ...current,
      contracts: [{ contract_id: 'abc', is_primary: true } as never],
      research_areas: [{ lever_id: 10, id: 10 } as never],
      strategic_objectives: [{ id: 1, name: 'SO 1' }],
      impact_outcomes: [{ id: 5, name: 'IO 5' }]
    }));

    await component.saveData();

    expect(api.PATCH_Alignments).toHaveBeenCalledWith(
      1,
      {
        contracts: [{ contract_id: 'abc', is_primary: true }],
        result_sdgs: [{ clarisa_sdg_id: 2 }],
        research_areas: [{ lever_id: '10' }],
        strategic_objectives: [{ strategic_objective_id: 1 }],
        impact_outcomes: [{ impact_outcome_id: 5 }]
      },
      { portfolioId: 2, return: true }
    );
  });

  it('should send empty impact_outcomes for portfolio 2 when indicator is not OICR or Policy Change', async () => {
    cache.metadata.set({ indicator_id: 1, portfolio_id: 2 });
    api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
    component.body.set({
      contracts: [],
      result_sdgs: [{ id: 3, clarisa_sdg_id: 3 } as never],
      primary_levers: [],
      contributor_levers: [],
      strategic_objectives: [],
      impact_outcomes: [{ id: 5, name: 'IO 5' }]
    });

    await component.saveData();

    expect(api.PATCH_Alignments.mock.calls[0][1].impact_outcomes).toBeUndefined();
    expect(api.PATCH_Alignments.mock.calls[0][1].result_sdgs).toEqual([{ clarisa_sdg_id: 3 }]);
  });

  it('should preserve result_sdgs for non-OICR indicators on portfolio 2 load', async () => {
    cache.metadata.set({ indicator_id: 1, portfolio_id: 2 });
    getContractsService.setCatalog([]);
    api.GET_Alignments.mockResolvedValue({
      data: {
        contracts: [],
        result_sdgs: [{ clarisa_sdg_id: 7, id: 7 }],
        research_areas: [],
        strategic_objectives: [],
        impact_outcomes: []
      }
    });

    await component.getData();

    expect(component.body().result_sdgs).toHaveLength(1);
    expect(component.body().result_sdgs[0].id).toBe(7);
  });

  it('should clear result_sdgs for OICR on portfolio 2 load', async () => {
    cache.metadata.set({ indicator_id: 5, portfolio_id: 2 });
    getContractsService.setCatalog([]);
    api.GET_Alignments.mockResolvedValue({
      data: {
        contracts: [],
        result_sdgs: [{ clarisa_sdg_id: 7, id: 7 }],
        research_areas: [],
        strategic_objectives: [],
        impact_outcomes: []
      }
    });

    await component.getData();

    expect(component.body().result_sdgs).toEqual([]);
  });

  it('should render SDG field for non-OICR indicators on portfolio 2', () => {
    cache.metadata.set({ indicator_id: 1, portfolio_id: 2 });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Contribution to SDG');
    expect(fixture.nativeElement.textContent).not.toContain('Primary Levers');
  });

  it('should preserve root SDGs for non-OICR indicators', async () => {
    cache.metadata.set({ indicator_id: 1 });
    api.GET_Alignments.mockResolvedValue({
      data: {
        contracts: [{ contract_id: 'A1' }],
        result_sdgs: [{ clarisa_sdg_id: 2, id: 2, created_at: '2024-01-01', updated_at: '2024-01-02', is_active: true }],
        primary_levers: [{ lever_id: 1, result_lever_sdgs: [] }],
        contributor_levers: []
      }
    });

    await component.getData();

    expect(component.body().result_sdgs).toHaveLength(1);
    expect(component.body().result_sdgs[0].sdg_id).toBe(2);
    expect(component.body().primary_levers[0].result_lever_sdgs).toEqual([]);
  });

  it('should normalize result-level SDGs from clarisa_sdg_id when id is missing', async () => {
    cache.metadata.set({ indicator_id: 1 });
    api.GET_Alignments.mockResolvedValue({
      data: {
        contracts: [],
        result_sdgs: [{ result_sdg_id: 30439, result_id: 22604, clarisa_sdg_id: 13, created_at: '', updated_at: '', is_active: true }],
        primary_levers: [],
        contributor_levers: []
      }
    });

    await component.getData();

    expect(component.body().result_sdgs[0].id).toBe(13);
    expect(component.body().result_sdgs[0].sdg_id).toBe(13);
  });

  it('should normalize result-level SDGs from sdg_id and drop invalid entries', async () => {
    cache.metadata.set({ indicator_id: 1 });
    api.GET_Alignments.mockResolvedValue({
      data: {
        contracts: [],
        result_sdgs: [{ sdg_id: 7 }, {}],
        primary_levers: [],
        contributor_levers: []
      }
    });

    await component.getData();

    expect(component.body().result_sdgs).toHaveLength(1);
    expect(component.body().result_sdgs[0].id).toBe(7);
    expect(component.body().result_sdgs[0].sdg_id).toBe(7);
  });

  it('should save an empty result-level SDG list for non-OICR when selection is missing', async () => {
    cache.metadata.set({ indicator_id: 1 });
    api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
    api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [], primary_levers: [], contributor_levers: [] } });
    component.body.set({
      contracts: [],
      primary_levers: [],
      contributor_levers: []
    } as any);

    await component.saveData();

    const payload = api.PATCH_Alignments.mock.calls[0][1];
    expect(payload.result_sdgs).toEqual([]);
  });

  it('should render project selector and dedicated SDGs field for non-OICR indicators', () => {
    cache.metadata.set({ indicator_id: 1, portafolio_id: 1 });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Contribution to SDG');
    expect(text).toContain('Contributing projects');
  });

  it('should use the SDG id as option value and XL columns because the SDGs service returns unique id values', () => {
    cache.metadata.set({ indicator_id: 1, portafolio_id: 1 });
    fixture.detectChanges();

    const fields = fixture.debugElement
      .queryAll(By.directive(MultiselectComponent))
      .map(debugElement => debugElement.componentInstance as MultiselectComponent);
    const sdgsField = fields.find(multiselect => multiselect.label === 'Contribution to SDG');
    const primaryLeversField = fields.find(multiselect => multiselect.label === 'Primary Levers');
    const contributingLeversField = fields.find(multiselect => multiselect.label === 'Contributing Levers');

    expect(sdgsField?.optionValue).toBe('id');
    expect(sdgsField?.textSpan).toBe('Indicate the SDGs to which the result is linked.');
    expect(sdgsField?.columnsOnXl).toBe(true);
    expect(sdgsField?.columnsOnXlCount).toBe(3);
    expect(primaryLeversField?.textSpan).toBe('Primary Levers selected');
    expect(primaryLeversField?.columnsOnXlCount).toBe(2);
    expect(contributingLeversField?.textSpan).toBe('Contributing Levers selected');
    expect(contributingLeversField?.columnsOnXlCount).toBe(2);
  });

  it('should keep contributing projects visible for OICR indicators', () => {
    cache.metadata.set({ indicator_id: 5 });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Contributing projects');
  });

  it('should call PATCH_Alignments and show toast on saveData', async () => {
    api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
    api.GET_Alignments.mockResolvedValue({ data: { contracts: [{ id: 1 }] } });
    jest.spyOn(component, 'getData');

    component.body.set({
      contracts: [],
      result_sdgs: [],
      primary_levers: [
        {
          lever_id: 1,
          result_lever_id: 1,
          result_id: 1,
          lever_role_id: 1,
          is_primary: true,
          result_lever_sdgs: [{ id: 1, created_at: '2024-01-01', is_active: true, updated_at: '2024-01-01', clarisa_sdg_id: 1 } as any]
        }
      ],
      contributor_levers: []
    });

    await component.saveData();
    expect(api.PATCH_Alignments).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        contracts: expect.any(Array),
        result_sdgs: expect.any(Array)
      }),
      { return: true }
    );
    expect(actions.showToast).toHaveBeenCalled();
    expect(component.getData).toHaveBeenCalled();
  });

  it('should merge contributor levers when saving default alignment', async () => {
    cache.metadata.set({ indicator_id: 5 });
    api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
    api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [], primary_levers: [], contributor_levers: [] } });

    const primaryLever = { lever_id: 1, result_lever_id: 1, result_id: 1, lever_role_id: 1, is_primary: true };
    const contributorLever = { lever_id: 2, result_lever_id: 2, result_id: 1, lever_role_id: 2, is_primary: false };
    component.body.set({
      contracts: [],
      result_sdgs: [],
      primary_levers: [primaryLever],
      contributor_levers: [contributorLever]
    });

    await component.saveData();

    const payload = api.PATCH_Alignments.mock.calls[0][1];
    expect(payload.contributor_levers).toHaveLength(1);
    expect(payload.contributor_levers[0].lever_id).toBe(2);
    expect(payload.primary_levers).toHaveLength(1);
  });

  it('should send selected root SDGs for non-OICR indicators', async () => {
    cache.metadata.set({ indicator_id: 1 });
    api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
    api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [], primary_levers: [], contributor_levers: [] } });
    component.body.set({
      contracts: [],
      result_sdgs: [{ clarisa_sdg_id: 7, id: 7, created_at: '2024-01-01', updated_at: '2024-01-02', is_active: true } as any],
      primary_levers: [{ lever_id: 1, result_lever_sdgs: [{ clarisa_sdg_id: 99, id: 99 } as any] } as any],
      contributor_levers: []
    });

    await component.saveData();

    const payload = api.PATCH_Alignments.mock.calls[0][1];
    expect(payload.result_sdgs).toEqual([
      {
        created_at: '2024-01-01',
        is_active: true,
        updated_at: '2024-01-02',
        clarisa_sdg_id: 7,
        result_id: 1
      }
    ]);
  });

  it('should not call showToast or getData if PATCH_Alignments fails', async () => {
    api.PATCH_Alignments.mockResolvedValue({ successfulRequest: false });
    jest.spyOn(component, 'getData');
    await component.saveData();
    expect(actions.showToast).not.toHaveBeenCalled();
    expect(component.getData).not.toHaveBeenCalled();
  });

  it('should navigate to back page', async () => {
    api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
    api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [] } });
    await component.saveData('back');
    expect(router.navigate).toHaveBeenCalledWith(['result', 1, 'general-information'], { queryParams: { version: 'v1' }, replaceUrl: true });
  });

  it('should navigate to next page', async () => {
    api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
    api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [] } });
    await component.saveData('next');
    expect(router.navigate).toHaveBeenCalledWith(['result', 1, 'next-section'], { queryParams: { version: 'v1' }, replaceUrl: true });
  });

  it('should use version in queryParams if present', async () => {
    api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
    api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [] } });
    route.snapshot.queryParamMap.get = (key: string) => (key === 'version' ? 'v1' : null);
    await component.saveData('next');
    expect(router.navigate).toHaveBeenCalledWith(['result', 1, 'next-section'], { queryParams: { version: 'v1' }, replaceUrl: true });
  });

  it('should not use version in queryParams if not present', async () => {
    api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
    api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [] } });
    route.snapshot.queryParamMap.get = () => null;
    await component.saveData('next');
    expect(router.navigate).toHaveBeenCalledWith(['result', 1, 'next-section'], { queryParams: undefined, replaceUrl: true });
  });

  it('should not PATCH if not editable', async () => {
    submission.isEditableStatus.mockReturnValue(false);
    await component.saveData();
    expect(api.PATCH_Alignments).not.toHaveBeenCalled();
  });

  it('should navigate to next when not editable and saveData("next") (cover line 194)', async () => {
    submission.isEditableStatus.mockReturnValue(false);
    await component.saveData('next');
    expect(api.PATCH_Alignments).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['result', 1, 'next-section'], { queryParams: { version: 'v1' }, replaceUrl: true });
  });

  it('should call markAsPrimary for contract', () => {
    const contract1 = { is_primary: false, is_active: true, result_contract_id: 1, result_id: 1, contract_id: '1', contract_role_id: 1 };
    const contract2 = { is_primary: true, is_active: true, result_contract_id: 2, result_id: 1, contract_id: '2', contract_role_id: 1 };
    component.body.set({ contracts: [contract1, contract2], result_sdgs: [], primary_levers: [], contributor_levers: [] });
    component.markAsPrimary(contract1, 'contract');
    const updatedContracts = component.body().contracts;
    expect(updatedContracts.find(c => c.contract_id === '1')?.is_primary).toBe(true);
    expect(updatedContracts.find(c => c.contract_id === '2')?.is_primary).toBe(false);
    expect(actions.saveCurrentSection).toHaveBeenCalled();
  });

  it('should call markAsPrimary for lever', () => {
    const lever1 = { is_primary: false, lever_id: 1, result_lever_strategic_outcomes: [] };
    component.body.set({ contracts: [], result_sdgs: [], primary_levers: [lever1], contributor_levers: [] });
    component.markAsPrimary(lever1, 'lever');
    const updatedLevers = component.body().primary_levers;
    expect(updatedLevers.find(l => l.lever_id === 1)?.is_primary).toBe(true);
    expect(actions.saveCurrentSection).toHaveBeenCalled();
  });

  it('should toggle lever to non-primary when already primary', () => {
    const lever1 = { is_primary: true, lever_id: 1, result_lever_strategic_outcomes: [] };
    component.body.set({ contracts: [], result_sdgs: [], primary_levers: [lever1], contributor_levers: [] });
    component.markAsPrimary(lever1, 'lever');
    const updatedLevers = component.body().primary_levers;
    expect(updatedLevers.find(l => l.lever_id === 1)?.is_primary).toBe(false);
  });

  it('should set non-target levers to is_primary false when marking one lever', () => {
    const lever1 = { is_primary: false, lever_id: 10, result_lever_strategic_outcomes: [] };
    const lever2 = { is_primary: true, lever_id: 20, result_lever_strategic_outcomes: [] };
    component.body.set({ contracts: [], result_sdgs: [], primary_levers: [lever1, lever2], contributor_levers: [] });
    component.markAsPrimary(lever1, 'lever');
    const updatedLevers = component.body().primary_levers;
    expect(updatedLevers.find(l => l.lever_id === 10)?.is_primary).toBe(true);
    expect(updatedLevers.find(l => l.lever_id === 20)?.is_primary).toBe(false);
  });

  it('should update optionsDisabled and primary_levers when body has primary_levers and contributor_levers', () => {
    const primaryLevers = [{ lever_id: 1, is_primary: true }];
    const contributorLevers = [{ lever_id: 2, is_primary: false }];
    component.body.set({
      contracts: [],
      result_sdgs: [],
      primary_levers: primaryLevers,
      contributor_levers: contributorLevers
    });
    fixture.detectChanges();
    expect(component.optionsDisabled()).toEqual(primaryLevers);
    expect(component.primaryOptionsDisabled()).toEqual(contributorLevers);
  });

  it('should call markAsPrimary for sdg', () => {
    const sdg1 = { sdg_id: 1, is_primary: false } as any;
    const sdg2 = { sdg_id: 2, is_primary: true } as any;
    component.body.set({
      contracts: [],
      result_sdgs: [sdg1, sdg2],
      primary_levers: [],
      contributor_levers: []
    });
    component.markAsPrimary(sdg1, 'sdg');
    const updatedSdgs = component.body().result_sdgs;
    const withSdgId = (sdg: any) => (sdg as { sdg_id?: number }).sdg_id;
    expect(updatedSdgs.find(s => withSdgId(s) === 1)).toBeDefined();
    expect((updatedSdgs.find(s => withSdgId(s) === 1) as any).is_primary).toBe(true);
    expect((updatedSdgs.find(s => withSdgId(s) === 2) as any).is_primary).toBe(false);
    expect(actions.saveCurrentSection).toHaveBeenCalled();
  });

  it('should leave body unchanged when markAsPrimary is called with unknown type', () => {
    const prev = { contracts: [], result_sdgs: [], primary_levers: [], contributor_levers: [] };
    component.body.set(prev);
    component.markAsPrimary({ is_primary: false }, 'unknown' as 'contract');
    expect(component.body()).toBe(prev);
    expect(actions.saveCurrentSection).toHaveBeenCalled();
  });

  it('should call canRemove and return true if editable', () => {
    submission.isEditableStatus.mockReturnValue(true);
    expect(component.canRemove()).toBe(true);
  });

  it('should call canRemove and return false if not editable', () => {
    submission.isEditableStatus.mockReturnValue(false);
    expect(component.canRemove()).toBe(false);
  });

  describe('saveData with lever outcomes', () => {
    it('should normalize outcomes when value is a number', async () => {
      api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
      api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [] } });

      const lever = { lever_id: 1, result_lever_strategic_outcomes: [] };
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [lever],
        contributor_levers: []
      });

      const signal = component.getLeverSignal(lever);
      signal.set({ result_lever_strategic_outcomes: [5] as any });

      await component.saveData();

      expect(api.PATCH_Alignments).toHaveBeenCalled();
      const callArgs = api.PATCH_Alignments.mock.calls[0];
      expect(callArgs[1].primary_levers[0].result_lever_strategic_outcomes[0]).toEqual({ lever_strategic_outcome_id: 5 });
    });

    it('should normalize outcomes when value is an object with lever_strategic_outcome_id', async () => {
      api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
      api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [] } });

      const lever = { lever_id: 1, result_lever_strategic_outcomes: [] };
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [lever],
        contributor_levers: []
      });

      const signal = component.getLeverSignal(lever);
      signal.set({ result_lever_strategic_outcomes: [{ lever_strategic_outcome_id: 10 }] as any });

      await component.saveData();

      expect(api.PATCH_Alignments).toHaveBeenCalled();
      const callArgs = api.PATCH_Alignments.mock.calls[0];
      expect(callArgs[1].primary_levers[0].result_lever_strategic_outcomes[0]).toEqual({ lever_strategic_outcome_id: 10 });
    });

    it('should normalize outcomes when value is an object with id', async () => {
      api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
      api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [] } });

      const lever = { lever_id: 1, result_lever_strategic_outcomes: [] };
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [lever],
        contributor_levers: []
      });

      const signal = component.getLeverSignal(lever);
      signal.set({ result_lever_strategic_outcomes: [{ id: 15 }] as any });

      await component.saveData();

      expect(api.PATCH_Alignments).toHaveBeenCalled();
      const callArgs = api.PATCH_Alignments.mock.calls[0];
      expect(callArgs[1].primary_levers[0].result_lever_strategic_outcomes[0]).toEqual({ id: 15, lever_strategic_outcome_id: 15 });
    });

    it('should normalize outcomes when value is invalid', async () => {
      api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
      api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [] } });

      const lever = { lever_id: 1, result_lever_strategic_outcomes: [] };
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [lever],
        contributor_levers: []
      });

      const signal = component.getLeverSignal(lever);
      signal.set({ result_lever_strategic_outcomes: [null] as any });

      await component.saveData();

      expect(api.PATCH_Alignments).toHaveBeenCalled();
      const callArgs = api.PATCH_Alignments.mock.calls[0];
      expect(callArgs[1].primary_levers[0].result_lever_strategic_outcomes[0]).toEqual({ lever_strategic_outcome_id: 0 });
    });

    it('should handle array of outcomes', async () => {
      api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
      api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [] } });

      const lever = { lever_id: 1, result_lever_strategic_outcomes: [] };
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [lever],
        contributor_levers: []
      });

      const signal = component.getLeverSignal(lever);
      signal.set({ result_lever_strategic_outcomes: [1, 2, 3] as any });

      await component.saveData();

      expect(api.PATCH_Alignments).toHaveBeenCalled();
      const callArgs = api.PATCH_Alignments.mock.calls[0];
      expect(callArgs[1].primary_levers[0].result_lever_strategic_outcomes).toHaveLength(3);
    });

    it('should handle single number outcome', async () => {
      api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
      api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [] } });

      const lever = { lever_id: 1, result_lever_strategic_outcomes: [] };
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [lever],
        contributor_levers: []
      });

      const signal = component.getLeverSignal(lever);
      signal.set({ result_lever_strategic_outcomes: 7 as any });

      await component.saveData();

      expect(api.PATCH_Alignments).toHaveBeenCalled();
      const callArgs = api.PATCH_Alignments.mock.calls[0];
      expect(callArgs[1].primary_levers[0].result_lever_strategic_outcomes).toHaveLength(1);
      expect(callArgs[1].primary_levers[0].result_lever_strategic_outcomes[0]).toEqual({ lever_strategic_outcome_id: 7 });
    });

    it('should handle single object outcome', async () => {
      api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
      api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [] } });

      const lever = { lever_id: 1, result_lever_strategic_outcomes: [] };
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [lever],
        contributor_levers: []
      });

      const signal = component.getLeverSignal(lever);
      signal.set({ result_lever_strategic_outcomes: { lever_strategic_outcome_id: 20 } as any });

      await component.saveData();

      expect(api.PATCH_Alignments).toHaveBeenCalled();
      const callArgs = api.PATCH_Alignments.mock.calls[0];
      expect(callArgs[1].primary_levers[0].result_lever_strategic_outcomes).toHaveLength(1);
      expect(callArgs[1].primary_levers[0].result_lever_strategic_outcomes[0]).toEqual({ lever_strategic_outcome_id: 20 });
    });

    it('should handle lever without signal', async () => {
      api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
      api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [] } });

      const lever = { lever_id: 999, result_lever_strategic_outcomes: [] };
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [lever],
        contributor_levers: []
      });

      await component.saveData();

      expect(api.PATCH_Alignments).toHaveBeenCalled();
      const callArgs = api.PATCH_Alignments.mock.calls[0];
      expect(callArgs[1].primary_levers[0]).toEqual(lever);
    });

    it('should map result_sdgs correctly from lever selections', async () => {
      api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
      api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [] } });

      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [
          {
            lever_id: 1,
            result_lever_id: 1,
            result_id: 1,
            lever_role_id: 1,
            is_primary: true,
            result_lever_sdgs: [{ id: 1, created_at: '2024-01-01', is_active: true, updated_at: '2024-01-01', clarisa_sdg_id: 1 } as any]
          }
        ],
        contributor_levers: []
      });

      await component.saveData();

      expect(api.PATCH_Alignments).toHaveBeenCalled();
      const callArgs = api.PATCH_Alignments.mock.calls[0];
      expect(callArgs[1].result_sdgs[0]).toEqual({
        created_at: '2024-01-01',
        is_active: true,
        updated_at: '2024-01-01',
        clarisa_sdg_id: 1,
        result_id: 1
      });
    });
  });

  describe('getShortDescription', () => {
    beforeEach(() => {
      component.containerRef = { nativeElement: { offsetWidth: 1000 } } as any;
    });

    it('should return full description when shorter than max for small screen', () => {
      component.containerWidth = 800;
      const description = 'Short text';
      expect(component.getShortDescription(description)).toBe('Short text');
    });

    it('should truncate description for small screen (< 900)', () => {
      component.containerWidth = 800;
      const description = 'a'.repeat(100);
      const result = component.getShortDescription(description);
      expect(result.length).toBe(76); // 73 + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('should truncate description for medium screen (900-1100)', () => {
      component.containerWidth = 1000;
      const description = 'a'.repeat(120);
      const result = component.getShortDescription(description);
      expect(result.length).toBe(108); // 105 + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('should truncate description for large screen (1100-1240)', () => {
      component.containerWidth = 1150;
      const description = 'a'.repeat(150);
      const result = component.getShortDescription(description);
      expect(result.length).toBe(138); // 135 + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('should truncate description for extra large screen (>= 1240)', () => {
      component.containerWidth = 1300;
      const description = 'a'.repeat(170);
      const result = component.getShortDescription(description);
      expect(result.length).toBe(158); // 155 + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('should return full description when shorter than max for extra large screen', () => {
      component.containerWidth = 1300;
      const description = 'Short text';
      expect(component.getShortDescription(description)).toBe('Short text');
    });
  });

  describe('getLeverName', () => {
    it('should return lever name with string id', () => {
      expect(component.getLeverName('1')).toBe('Lever 1');
    });

    it('should return lever name with number id', () => {
      expect(component.getLeverName(2)).toBe('Lever 2');
    });
  });

  describe('getLeverSdgSignal', () => {
    it('should return existing signal if already created', () => {
      const lever = { lever_id: 1, result_lever_sdgs: [{ id: 1 } as any] };
      const signal1 = component.getLeverSdgSignal(lever as any);
      const signal2 = component.getLeverSdgSignal(lever as any);
      expect(signal1).toBe(signal2);
    });

    it('should create new signal with sdgs from lever', () => {
      const lever = { lever_id: 2, result_lever_sdgs: [{ id: 2, clarisa_sdg_id: 2 } as any] };
      const s = component.getLeverSdgSignal(lever as any);
      expect(s().result_lever_sdgs).toEqual([{ id: 2, clarisa_sdg_id: 2 }]);
    });
  });

  describe('getLeverSignal', () => {
    it('should return existing signal if already created', () => {
      const lever = { lever_id: 1, result_lever_strategic_outcomes: [{ lever_strategic_outcome_id: 1 }] };
      const signal1 = component.getLeverSignal(lever);
      const signal2 = component.getLeverSignal(lever);
      expect(signal1).toBe(signal2);
    });

    it('should create new signal if not exists', () => {
      const lever = { lever_id: 2, result_lever_strategic_outcomes: [{ lever_strategic_outcome_id: 2 }] };
      const signal = component.getLeverSignal(lever);
      expect(signal().result_lever_strategic_outcomes).toEqual([{ lever_strategic_outcome_id: 2 }]);
    });

    it('should create signal with empty array if outcomes are missing', () => {
      const lever = { lever_id: 3 };
      const signal = component.getLeverSignal(lever);
      expect(signal().result_lever_strategic_outcomes).toEqual([]);
    });
  });

  describe('Other lever custom name', () => {
    const otherLever = {
      lever_id: 9,
      result_lever_id: 1,
      result_id: 1,
      lever_role_id: 1,
      is_primary: true,
      short_name: 'Other',
      other_names: 'Other',
      result_lever_sdgs: [],
      result_lever_sdg_targets: [],
      result_lever_strategic_outcomes: []
    } as any;

    beforeEach(() => {
      cache.metadata.set({ indicator_id: 5, portafolio_id: 1 });
      getLeversService.setCatalog(defaultLeversCatalog);
    });

    it('should identify Other lever by CLARISA lever id 9', () => {
      expect(component.isOtherLever(otherLever)).toBe(true);
      expect(component.isOtherLever({ ...otherLever, lever_id: 1 })).toBe(false);
    });

    it('should create custom name signal from existing lever value', () => {
      const signal = component.getLeverCustomNameSignal({ ...otherLever, custom_lever_name: 'Team A' });
      expect(signal().custom_lever_name).toBe('Team A');
    });

    it('should render custom name field when Other lever is selected', () => {
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [otherLever],
        contributor_levers: []
      });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Name of the team or area creating the result');
    });

    it('should not show or require strategic outcomes when Other lever is selected for OICR', () => {
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [otherLever],
        contributor_levers: []
      });
      fixture.detectChanges();

      const leverCard = fixture.debugElement.query(By.directive(AllianceLeverCardComponent)).componentInstance as AllianceLeverCardComponent;
      expect(leverCard.showStrategicOutcomes).toBe(false);
      expect(leverCard.strategicOutcomesRequired).toBe(false);
    });

    it('should send custom_lever_name for Other lever on save', async () => {
      api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
      api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [], primary_levers: [], contributor_levers: [] } });
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [otherLever],
        contributor_levers: []
      });
      component.getLeverCustomNameSignal(otherLever).set({ custom_lever_name: 'Custom team' });

      await component.saveData();

      const payload = api.PATCH_Alignments.mock.calls[0][1];
      expect(payload.primary_levers[0].custom_lever_name).toBe('Custom team');
    });

    it('should fall back to the existing custom_lever_name for Other lever on save', async () => {
      api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
      api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [], primary_levers: [], contributor_levers: [] } });
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [{ ...otherLever, custom_lever_name: ' Existing team ' }],
        contributor_levers: []
      });

      await component.saveData();

      const payload = api.PATCH_Alignments.mock.calls[0][1];
      expect(payload.primary_levers[0].custom_lever_name).toBe('Existing team');
    });

    it('should fall back to lever custom name when Other signal value is missing', async () => {
      api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
      api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [], primary_levers: [], contributor_levers: [] } });
      const leverWithCustomName = { ...otherLever, custom_lever_name: 'Existing team' };
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [leverWithCustomName],
        contributor_levers: []
      });
      component.getLeverCustomNameSignal(leverWithCustomName).set({} as any);

      await component.saveData();

      const payload = api.PATCH_Alignments.mock.calls[0][1];
      expect(payload.primary_levers[0].custom_lever_name).toBe('Existing team');
    });

    it('should send an empty custom_lever_name for Other lever when no value exists', async () => {
      api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
      api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [], primary_levers: [], contributor_levers: [] } });
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [otherLever],
        contributor_levers: []
      });
      component.getLeverCustomNameSignal(otherLever).set({} as any);

      await component.saveData();

      const payload = api.PATCH_Alignments.mock.calls[0][1];
      expect(payload.primary_levers[0].custom_lever_name).toBe('');
    });

    it('should clear custom_lever_name from non-Other levers on save', async () => {
      api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
      api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [], primary_levers: [], contributor_levers: [] } });
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [{ ...otherLever, lever_id: 1, custom_lever_name: 'Should be cleared' }],
        contributor_levers: []
      });

      await component.saveData();

      const payload = api.PATCH_Alignments.mock.calls[0][1];
      expect(payload.primary_levers[0].custom_lever_name).toBeUndefined();
    });

    it('should keep the same custom name signal and hydrate it after save reload', async () => {
      api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
      api.GET_Alignments.mockResolvedValue({
        data: {
          contracts: [],
          result_sdgs: [],
          primary_levers: [
            {
              lever_id: 9,
              result_lever_id: 36141,
              result_id: 22604,
              lever_role_id: 1,
              is_primary: true,
              custom_lever_name: 'name test',
              result_lever_sdg_targets: [],
              result_lever_strategic_outcomes: []
            }
          ],
          contributor_levers: []
        }
      });

      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [otherLever],
        contributor_levers: []
      });
      const customNameSignal = component.getLeverCustomNameSignal(otherLever);
      customNameSignal.set({ custom_lever_name: 'name test' });

      await component.saveData();

      const reloadedLever = component.body().primary_levers[0];
      expect(component.getLeverCustomNameSignal(reloadedLever)).toBe(customNameSignal);
      expect(customNameSignal().custom_lever_name).toBe('name test');
      expect(reloadedLever.custom_lever_name).toBe('name test');
    });

    it('should preserve typed custom name when GET after save omits custom_lever_name', async () => {
      api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
      api.GET_Alignments.mockResolvedValue({
        data: {
          contracts: [],
          result_sdgs: [],
          primary_levers: [
            {
              lever_id: 9,
              result_lever_id: 36141,
              result_id: 22604,
              lever_role_id: 1,
              is_primary: true,
              result_lever_sdg_targets: [],
              result_lever_strategic_outcomes: []
            }
          ],
          contributor_levers: []
        }
      });

      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [otherLever],
        contributor_levers: []
      });
      const customNameSignal = component.getLeverCustomNameSignal(otherLever);
      customNameSignal.set({ custom_lever_name: 'name test' });

      await component.saveData();

      expect(customNameSignal().custom_lever_name).toBe('name test');
      expect(component.body().primary_levers[0].custom_lever_name).toBe('name test');
    });

    it('should normalize padded custom lever name signal when API omits custom_lever_name on reload', async () => {
      api.GET_Alignments.mockResolvedValueOnce({
        data: {
          contracts: [],
          result_sdgs: [],
          primary_levers: [
            {
              lever_id: 9,
              result_lever_id: 1,
              result_id: 1,
              lever_role_id: 1,
              is_primary: true,
              custom_lever_name: 'Team X'
            }
          ],
          contributor_levers: []
        }
      });

      await component.getData();

      const otherLever = component.body().primary_levers[0];
      const customNameSignal = component.getLeverCustomNameSignal(otherLever);
      customNameSignal.set({ custom_lever_name: '  Team X  ' });

      api.GET_Alignments.mockResolvedValueOnce({
        data: {
          contracts: [],
          result_sdgs: [],
          primary_levers: [
            {
              lever_id: 9,
              result_lever_id: 1,
              result_id: 1,
              lever_role_id: 1,
              is_primary: true,
              result_lever_sdg_targets: [],
              result_lever_strategic_outcomes: []
            }
          ],
          contributor_levers: []
        }
      });

      await component.getData();

      expect(customNameSignal().custom_lever_name).toBe('Team X');
    });

    it('should apply API custom lever name when existing signal value is undefined', async () => {
      api.GET_Alignments.mockResolvedValueOnce({
        data: {
          contracts: [],
          result_sdgs: [],
          primary_levers: [
            {
              lever_id: 9,
              result_lever_id: 1,
              result_id: 1,
              lever_role_id: 1,
              is_primary: true,
              custom_lever_name: 'API team'
            }
          ],
          contributor_levers: []
        }
      });

      await component.getData();

      const otherLever = component.body().primary_levers[0];
      const customNameSignal = component.getLeverCustomNameSignal(otherLever);
      customNameSignal.set({ custom_lever_name: undefined as unknown as string });

      api.GET_Alignments.mockResolvedValueOnce({
        data: {
          contracts: [],
          result_sdgs: [],
          primary_levers: [
            {
              lever_id: 9,
              result_lever_id: 1,
              result_id: 1,
              lever_role_id: 1,
              is_primary: true,
              custom_lever_name: 'API team'
            }
          ],
          contributor_levers: []
        }
      });

      await component.getData();

      expect(customNameSignal().custom_lever_name).toBe('API team');
    });

    it('should fall back to lever custom_lever_name when no signal exists during apply', () => {
      const result = (component as any).applyCustomNamesToLevers([
        { lever_id: 9, custom_lever_name: 'from lever' }
      ]);

      expect(result[0].custom_lever_name).toBe('from lever');
    });

    it('should default custom lever name to empty string when no signal or lever value exists', () => {
      const result = (component as any).applyCustomNamesToLevers([{ lever_id: 9 }]);

      expect(result[0].custom_lever_name).toBe('');
    });
  });

  describe('getData', () => {
    it('should migrate legacy flat result_sdgs onto a single primary lever', async () => {
      api.GET_Alignments.mockResolvedValue({
        data: {
          contracts: [],
          result_sdgs: [
            { clarisa_sdg_id: 1, id: 1, created_at: '', updated_at: '', is_active: true },
            { clarisa_sdg_id: 2, id: 2, created_at: '', updated_at: '', is_active: true }
          ],
          primary_levers: [
            {
              lever_id: 10,
              result_lever_id: 1,
              result_id: 1,
              lever_role_id: 1,
              is_primary: true
            }
          ],
          contributor_levers: []
        }
      });

      await component.getData();

      expect(component.body().result_sdgs).toEqual([]);
      expect(component.body().primary_levers[0].result_lever_sdgs?.[0].sdg_id).toBe(1);
      expect(component.body().primary_levers[0].result_lever_sdgs?.[1].sdg_id).toBe(2);
    });

    it('should handle missing result_sdgs', async () => {
      api.GET_Alignments.mockResolvedValue({
        data: {
          contracts: [],
          primary_levers: [],
          contributor_levers: []
        }
      });

      await component.getData();

      expect(component.body().result_sdgs).toEqual([]);
    });
  });

  describe('constructor', () => {
    it('should register version change watcher', () => {
      const versionWatcher = TestBed.inject(VersionWatcherService);
      expect(versionWatcher.onVersionChange).toHaveBeenCalled();
    });

    it('should call getData on version change', async () => {
      api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [], primary_levers: [], contributor_levers: [] } });
      const versionWatcher = TestBed.inject(VersionWatcherService);
      const getDataSpy = jest.spyOn(component, 'getData').mockResolvedValue();

      // Get the callback that was registered
      const callback = (versionWatcher.onVersionChange as jest.Mock).mock.calls[0][0];
      await callback();

      expect(getDataSpy).toHaveBeenCalled();
    });
  });

  describe('effects', () => {
    it('should update optionsDisabled when primary_levers change', fakeAsync(() => {
      const primaryLever = { lever_id: 1, name: 'Lever 1' };
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [primaryLever],
        contributor_levers: []
      });

      tick();
      flush();
      fixture.detectChanges();

      const disabled = component.optionsDisabled();
      expect(disabled).toEqual([primaryLever]);
    }));

    it('should set optionsDisabled from primary_levers when truthy (cover line 89-90)', fakeAsync(() => {
      const levers = [{ lever_id: 1, name: 'L1' }];
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: levers as any,
        contributor_levers: []
      });
      fixture.detectChanges();
      tick();
      flush();
      expect(component.optionsDisabled()).toEqual(levers);
    }));

    it('should set optionsDisabled to empty array when primary_levers is falsy (cover || [] branch line 89)', fakeAsync(() => {
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: undefined as any,
        contributor_levers: []
      });
      tick(0);
      TestBed.flushEffects();
      expect(component.optionsDisabled()).toEqual([]);
    }));

    it('getPrimaryLeversForOptions should return [] when primary_levers is undefined (cover || [] branch)', () => {
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: undefined as any,
        contributor_levers: []
      });
      expect(component.getPrimaryLeversForOptions()).toEqual([]);
    });

    it('should update primaryOptionsDisabled when contributor_levers change', fakeAsync(() => {
      const contributorLever = { lever_id: 2, name: 'Lever 2' };
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [],
        contributor_levers: [contributorLever]
      });

      tick();
      flush();
      fixture.detectChanges();

      const disabled = component.primaryOptionsDisabled();
      expect(disabled).toEqual([contributorLever]);
    }));

    it('should set primaryOptionsDisabled from contributor_levers when truthy (cover line 96-97)', fakeAsync(() => {
      const levers = [{ lever_id: 2, name: 'L2' }];
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [],
        contributor_levers: levers as any
      });
      fixture.detectChanges();
      tick();
      flush();
      expect(component.primaryOptionsDisabled()).toEqual(levers);
    }));

    it('should set primaryOptionsDisabled to empty array when contributor_levers is falsy (cover || [] branch line 97)', fakeAsync(() => {
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [],
        contributor_levers: undefined as any
      });
      tick(0);
      TestBed.flushEffects();
      expect(component.primaryOptionsDisabled()).toEqual([]);
    }));

    it('getContributorLeversForOptions should return [] when contributor_levers is undefined (cover || [] branch)', () => {
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [],
        contributor_levers: undefined as any
      });
      expect(component.getContributorLeversForOptions()).toEqual([]);
    });
  });

  describe('saveData result_sdgs mapping', () => {
    it('should map result_sdgs with all properties', async () => {
      api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
      api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [] } });

      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [
          {
            lever_id: 1,
            result_lever_id: 1,
            result_id: 1,
            lever_role_id: 1,
            is_primary: true,
            result_lever_sdgs: [
              {
                id: 5,
                clarisa_sdg_id: 5,
                created_at: '2024-01-01',
                is_active: true,
                updated_at: '2024-01-02'
              } as any
            ]
          }
        ],
        contributor_levers: []
      });

      await component.saveData();

      expect(api.PATCH_Alignments).toHaveBeenCalled();
      const callArgs = api.PATCH_Alignments.mock.calls[0];
      expect(callArgs[1].result_sdgs[0]).toEqual({
        created_at: '2024-01-01',
        is_active: true,
        updated_at: '2024-01-02',
        clarisa_sdg_id: 5,
        result_id: 1
      });
    });

    it('should map result_sdgs when array exists', async () => {
      api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
      api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [] } });

      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [
          {
            lever_id: 1,
            result_lever_id: 1,
            result_id: 1,
            lever_role_id: 1,
            is_primary: true,
            result_lever_sdgs: [
              { id: 1, created_at: '2024-01-01', is_active: true, updated_at: '2024-01-01', clarisa_sdg_id: 1 } as any,
              { id: 2, created_at: '2024-01-02', is_active: true, updated_at: '2024-01-02', clarisa_sdg_id: 2 } as any
            ]
          }
        ],
        contributor_levers: []
      });

      await component.saveData();

      expect(api.PATCH_Alignments).toHaveBeenCalled();
      const callArgs = api.PATCH_Alignments.mock.calls[0];
      expect(callArgs[1].result_sdgs).toHaveLength(2);
      expect(callArgs[1].result_sdgs[0].clarisa_sdg_id).toBe(1);
      expect(callArgs[1].result_sdgs[1].clarisa_sdg_id).toBe(2);
    });

    it('should handle result_sdgs as undefined', async () => {
      api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
      api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [] } });

      component.body.set({
        contracts: [],
        result_sdgs: undefined as any,
        primary_levers: [],
        contributor_levers: []
      });

      await component.saveData();

      expect(api.PATCH_Alignments).toHaveBeenCalled();
      const callArgs = api.PATCH_Alignments.mock.calls[0];
      expect(callArgs[1].result_sdgs).toEqual([]);
    });
  });

  describe('contractServiceParams', () => {
    it('should set exclude-pooled-funding to false when indicator_id is 5', () => {
      cache.metadata.set({ indicator_id: 5 });
      expect(component.contractServiceParams()['exclude-pooled-funding']).toBe(false);
    });

    it('should set exclude-pooled-funding to true when indicator_id is not 5', () => {
      cache.metadata.set({ indicator_id: 4 });
      expect(component.contractServiceParams()['exclude-pooled-funding']).toBe(true);
    });
  });

  it('should not auto-add or lock the primary project lever', () => {
    component.body.set({
      contracts: [{ is_primary: true, lever_id: 42 } as any],
      result_sdgs: [],
      primary_levers: [],
      contributor_levers: []
    });

    fixture.detectChanges();
    TestBed.flushEffects();

    expect(component.body().primary_levers).toEqual([]);
    expect(component.primaryOptionsDisabled()).toEqual([]);
  });

  describe('removePrimaryLever / removeContributorLever', () => {
    const lever = {
      lever_id: 42,
      result_lever_id: 1,
      result_id: 1,
      lever_role_id: 1,
      is_primary: true,
      short_name: 'X',
      other_names: '',
      result_lever_sdgs: [],
      result_lever_sdg_targets: [],
      result_lever_strategic_outcomes: []
    } as any;

    it('should remove primary lever when editable and not required', () => {
      submission.isEditableStatus.mockReturnValue(true);
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [lever],
        contributor_levers: []
      });
      component.getLeverSignal(lever);
      component.getLeverSdgSignal(lever);

      component.removePrimaryLever(lever);

      expect(component.body().primary_levers).toEqual([]);
      expect(actions.saveCurrentSection).toHaveBeenCalled();
    });

    it('should not remove primary when not editable', () => {
      submission.isEditableStatus.mockReturnValue(false);
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [lever],
        contributor_levers: []
      });
      component.removePrimaryLever(lever);
      expect(component.body().primary_levers).toHaveLength(1);
    });

    it('should remove primary lever even when it matches the primary contract lever', () => {
      submission.isEditableStatus.mockReturnValue(true);
      component.body.set({
        contracts: [{ is_primary: true, lever_id: 42 }],
        result_sdgs: [],
        primary_levers: [lever],
        contributor_levers: []
      });
      component.removePrimaryLever(lever);
      expect(component.body().primary_levers).toEqual([]);
    });

    it('should remove contributor lever when editable', () => {
      submission.isEditableStatus.mockReturnValue(true);
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [],
        contributor_levers: [lever]
      });
      component.removeContributorLever(lever);
      expect(component.body().contributor_levers).toEqual([]);
      expect(actions.saveCurrentSection).toHaveBeenCalled();
    });

    it('should not remove contributor when not editable', () => {
      submission.isEditableStatus.mockReturnValue(false);
      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [],
        contributor_levers: [lever]
      });
      component.removeContributorLever(lever);
      expect(component.body().contributor_levers).toHaveLength(1);
    });
  });

  describe('getData normalization', () => {
    it('should normalize SDG targets from numbers and mixed object shapes', async () => {
      api.GET_Alignments.mockResolvedValue({
        data: {
          contracts: [],
          result_sdgs: [],
          primary_levers: [
            {
              lever_id: 1,
              result_lever_sdg_targets: [3, { sdg_target_id: 4 }, { id: '5' }, { id: 'bad' }, null] as any
            }
          ],
          contributor_levers: []
        }
      });
      await component.getData();
      const targets = component.body().primary_levers[0].result_lever_sdg_targets ?? [];
      expect(targets.map(t => t.sdg_target_id)).toEqual([3, 4, 5]);
    });

    it('should migrate legacy result_sdgs onto a single contributor lever', async () => {
      api.GET_Alignments.mockResolvedValue({
        data: {
          contracts: [],
          result_sdgs: [{ clarisa_sdg_id: 9, id: 9, created_at: '', updated_at: '', is_active: true }],
          primary_levers: [],
          contributor_levers: [{ lever_id: 20, result_lever_id: 1, result_id: 1, lever_role_id: 1, is_primary: false }]
        }
      });
      await component.getData();
      expect(component.body().contributor_levers[0].result_lever_sdgs?.[0].sdg_id).toBe(9);
    });
  });

  describe('saveData with SDG signal merge', () => {
    it('should merge leverSdgSignals targets into payload', async () => {
      api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
      api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [], primary_levers: [], contributor_levers: [] } });

      const lever = {
        lever_id: 11,
        result_lever_id: 1,
        result_id: 1,
        lever_role_id: 1,
        is_primary: true,
        result_lever_sdgs: [{ id: 1, clarisa_sdg_id: 1 } as any],
        result_lever_sdg_targets: []
      } as any;

      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [lever],
        contributor_levers: []
      });

      const sdgSig = component.getLeverSdgSignal(lever);
      sdgSig.set({
        result_lever_sdgs: [],
        result_lever_sdg_targets: [{ sdg_target_id: 21 }, { sdg_target_id: 0 }, { sdg_target_id: Number.NaN } as any]
      });

      await component.saveData();

      const payload = api.PATCH_Alignments.mock.calls[0][1];
      expect(payload.primary_levers[0].result_lever_sdg_targets).toEqual([{ sdg_target_id: 21 }]);
      expect(payload.primary_levers[0].result_lever_sdgs).toEqual([]);
    });

    it('treats undefined result_lever_sdg_targets as empty when merging', async () => {
      api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
      api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [], primary_levers: [], contributor_levers: [] } });

      const lever = {
        lever_id: 12,
        result_lever_id: 1,
        result_id: 1,
        lever_role_id: 1,
        is_primary: true,
        result_lever_sdgs: [],
        result_lever_sdg_targets: []
      } as any;

      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [lever],
        contributor_levers: []
      });

      const sdgSig = component.getLeverSdgSignal(lever);
      sdgSig.set({ result_lever_sdgs: [], result_lever_sdg_targets: undefined as any });

      await component.saveData();

      expect(api.PATCH_Alignments.mock.calls[0][1].primary_levers[0].result_lever_sdg_targets).toEqual([]);
    });
  });

  describe('additional branch coverage', () => {
    it('skips legacy root SDG migration when any lever already has SDGs', async () => {
      api.GET_Alignments.mockResolvedValue({
        data: {
          contracts: [],
          result_sdgs: [{ clarisa_sdg_id: 1, id: 1, created_at: '', updated_at: '', is_active: true }],
          primary_levers: [
            {
              lever_id: 10,
              result_lever_sdgs: [{ id: 2, clarisa_sdg_id: 2, created_at: '', updated_at: '', is_active: true } as any]
            }
          ],
          contributor_levers: []
        }
      });
      await component.getData();
      expect(component.body().primary_levers[0].result_lever_sdgs?.[0].sdg_id).toBe(2);
    });

    it('maps result_sdgs payload using clarisa_sdg_id when id is absent', async () => {
      api.PATCH_Alignments.mockResolvedValue({ successfulRequest: true });
      api.GET_Alignments.mockResolvedValue({ data: { contracts: [], result_sdgs: [], primary_levers: [], contributor_levers: [] } });

      component.body.set({
        contracts: [],
        result_sdgs: [],
        primary_levers: [
          {
            lever_id: 1,
            result_lever_id: 1,
            result_id: 1,
            lever_role_id: 1,
            is_primary: true,
            result_lever_sdgs: [{ clarisa_sdg_id: 42, created_at: 'a', is_active: true, updated_at: 'b' } as any]
          }
        ],
        contributor_levers: []
      });

      await component.saveData();

      const sent = api.PATCH_Alignments.mock.calls[0][1].result_sdgs[0];
      expect(sent.clarisa_sdg_id).toBe(42);
    });

    it('getLeverSdgSignal uses empty arrays when lever omits sdg fields', () => {
      const lever = { lever_id: 55 } as any;
      const s = component.getLeverSdgSignal(lever);
      expect(s().result_lever_sdgs).toEqual([]);
      expect(s().result_lever_sdg_targets).toEqual([]);
    });

    it('normalizeSdgs picks clarisa_sdg_id when sdg_id missing in getData', async () => {
      api.GET_Alignments.mockResolvedValue({
        data: {
          contracts: [],
          result_sdgs: [],
          primary_levers: [
            {
              lever_id: 1,
              result_lever_sdgs: [{ clarisa_sdg_id: 8, id: 8, created_at: '', updated_at: '', is_active: true } as any]
            }
          ],
          contributor_levers: []
        }
      });
      await component.getData();
      expect(component.body().primary_levers[0].result_lever_sdgs?.[0].sdg_id).toBe(8);
    });

    it('normalizeSdgs uses id when sdg_id and clarisa are absent', async () => {
      api.GET_Alignments.mockResolvedValue({
        data: {
          contracts: [],
          result_sdgs: [],
          primary_levers: [
            {
              lever_id: 1,
              result_lever_sdgs: [{ id: 99, created_at: '', updated_at: '', is_active: true } as any]
            }
          ],
          contributor_levers: []
        }
      });
      await component.getData();
      expect(component.body().primary_levers[0].result_lever_sdgs?.[0].sdg_id).toBe(99);
    });

    it('anyLeverHasSdgs handles null result_lever_sdgs on a lever', async () => {
      api.GET_Alignments.mockResolvedValue({
        data: {
          contracts: [],
          result_sdgs: [],
          primary_levers: [{ lever_id: 1, result_lever_sdgs: null as any }],
          contributor_levers: []
        }
      });
      await component.getData();
      expect(component.body().primary_levers[0].result_lever_sdgs).toEqual([]);
    });

    it('creates custom name signal when getData loads Other lever', async () => {
      api.GET_Alignments.mockResolvedValue({
        data: {
          contracts: [],
          result_sdgs: [],
          primary_levers: [
            {
              lever_id: 9,
              result_lever_id: 1,
              result_id: 1,
              lever_role_id: 1,
              is_primary: true,
              custom_lever_name: 'Team X'
            }
          ],
          contributor_levers: []
        }
      });

      await component.getData();

      const otherLever = component.body().primary_levers[0];
      expect(component.getLeverCustomNameSignal(otherLever)().custom_lever_name).toBe('Team X');
    });

    it('populates sdg child signals from lever fields when present', async () => {
      api.GET_Alignments.mockResolvedValue({
        data: {
          contracts: [],
          result_sdgs: [],
          primary_levers: [
            {
              lever_id: 1,
              result_lever_id: 1,
              result_id: 1,
              lever_role_id: 1,
              is_primary: true,
              result_lever_sdgs: [{ id: 3, clarisa_sdg_id: 3, created_at: '', updated_at: '', is_active: true }],
              result_lever_sdg_targets: [{ sdg_target_id: 30, sdg_target_code: '3.0' }]
            }
          ],
          contributor_levers: []
        }
      });

      await component.getData();

      const lever = component.body().primary_levers[0];
      const sdgSignal = component.getLeverSdgSignal(lever);
      expect(sdgSignal().result_lever_sdgs).toHaveLength(1);
      expect(sdgSignal().result_lever_sdg_targets).toEqual([{ sdg_target_id: 30, sdg_target_code: '3.0' }]);
    });

    it('defaults Other lever custom name and sdg child signals when fields are missing', async () => {
      api.GET_Alignments.mockResolvedValue({
        data: {
          contracts: [],
          result_sdgs: [],
          primary_levers: [
            {
              lever_id: 9,
              result_lever_id: 1,
              result_id: 1,
              lever_role_id: 1,
              is_primary: true
            }
          ],
          contributor_levers: []
        }
      });

      await component.getData();

      const otherLever = component.body().primary_levers[0];
      expect(component.getLeverCustomNameSignal(otherLever)().custom_lever_name).toBe('');
      expect(component.getLeverSdgSignal(otherLever)().result_lever_sdgs).toEqual([]);
      expect(component.getLeverSdgSignal(otherLever)().result_lever_sdg_targets).toEqual([]);
    });

    it('uses empty sdg defaults in populateLeverChildSignals when lever omits sdg fields', () => {
      const bareLever = {
        lever_id: 77,
        result_lever_id: 1,
        result_id: 1,
        lever_role_id: 1,
        is_primary: false
      } as any;
      (component as any).populateLeverChildSignals([bareLever]);

      expect(component.getLeverSdgSignal(bareLever)().result_lever_sdgs).toEqual([]);
      expect(component.getLeverSdgSignal(bareLever)().result_lever_sdg_targets).toEqual([]);
    });

    it('returns Other for lever id 9 in getLeverName', () => {
      expect(component.getLeverName(9)).toBe('Other');
    });

    it('delegates markAsPrimary through markAsPrimaryHandler', () => {
      const contract = { is_primary: false, contract_id: 'c1' };
      component.body.set({ contracts: [contract as any], result_sdgs: [], primary_levers: [], contributor_levers: [] });
      component.markAsPrimaryHandler(contract, 'contract');
      expect(component.body().contracts[0].is_primary).toBe(true);
    });
  });

  describe('parseResultLeverSdgTargetEntry / normalizeResultLeverSdgTargets', () => {
    it('parses numeric and object SDG target entries and drops invalid values', () => {
      expect(component.parseResultLeverSdgTargetEntry(4)).toEqual({ sdg_target_id: 4 });
      expect(component.parseResultLeverSdgTargetEntry({ sdg_target_id: 5 })).toEqual({ sdg_target_id: 5 });
      expect(component.parseResultLeverSdgTargetEntry({ id: '6' })).toEqual({ sdg_target_id: 6 });
      expect(component.parseResultLeverSdgTargetEntry(null)).toBeNull();
      expect(component.parseResultLeverSdgTargetEntry({ id: 'bad' })).toBeNull();
    });

    it('normalizes mixed SDG target arrays preserving object fields', () => {
      expect(component.normalizeResultLeverSdgTargets('not-array' as any)).toEqual([]);
      expect(
        component.normalizeResultLeverSdgTargets([
          3,
          { sdg_target_id: 4, sdg_target_code: '2.4' },
          { id: 'bad' }
        ])
      ).toEqual([
        { sdg_target_id: 3 },
        { sdg_target_id: 4, sdg_target_code: '2.4' }
      ]);
    });
  });
});
