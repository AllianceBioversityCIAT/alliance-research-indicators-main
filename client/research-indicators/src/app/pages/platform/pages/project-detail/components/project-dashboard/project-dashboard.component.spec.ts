import { Component, Input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ApiService } from '@shared/services/api.service';
import { ProjectUtilsService } from '@shared/services/project-utils.service';
import { ResultsCenterService } from '../../../results-center/results-center.service';
import { GetGeoScopeService } from '@shared/services/get-geo-scope.service';
import { GetTopContributorsContractsService } from '@shared/services/get-top-contributors-contracts.service';
import { GetTopMainContactPersonsService } from '@shared/services/get-top-main-contact-persons.service';
import { GetTopPartnersService } from '@shared/services/get-top-partners.service';
import { GetTopPrimaryLeversService } from '@shared/services/get-top-primary-levers.service';
import { FileManagerService } from '@shared/services/file-manager.service';
import { DocumentOverviewService } from '@shared/services/document-overview.service';
import { RolesService } from '@shared/services/cache/roles.service';
import { ActionsService } from '@shared/services/actions.service';
import { ProjectDashboardComponent } from './project-dashboard.component';
import { GeoScopeCardComponent } from '../geo-scope-card/geo-scope-card.component';
import { ProjectDashboardCardComponent } from '../project-dashboard-card/project-dashboard-card.component';
import { ResultsCenterTableComponent } from '../../../results-center/components/results-center-table/results-center-table.component';

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
  let topContributorsMock: ReturnType<typeof createRankedServiceMock>;
  let topMainContactsMock: ReturnType<typeof createRankedServiceMock>;
  let topPartnersMock: ReturnType<typeof createRankedServiceMock>;
  let topLeversMock: ReturnType<typeof createRankedServiceMock>;
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

  function createRankedServiceMock() {
    return {
      list: signal<any[]>([]),
      loading: signal(false),
      loadError: signal(false),
      main: jest.fn(),
      update: jest.fn()
    };
  }

  async function setup(
    contractId: string | null = 'C-1',
    options?: { isAdmin?: boolean; emptyOverview?: boolean; rejectOverviewFetch?: boolean }
  ) {
    topContributorsMock = createRankedServiceMock();
    topMainContactsMock = createRankedServiceMock();
    topPartnersMock = createRankedServiceMock();
    topLeversMock = createRankedServiceMock();
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
            { indicator: { indicator_id: 1, name: 'Output' }, count_results: 2 },
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
          providers: [
            GetTopContributorsContractsService,
            GetTopMainContactPersonsService,
            GetTopPartnersService,
            GetTopPrimaryLeversService,
            GetGeoScopeService
          ]
        },
        add: {
          imports: [ProjectDashboardCardStubComponent, GeoScopeCardStubComponent, ResultsCenterTableStubComponent],
          providers: [
            { provide: GetTopContributorsContractsService, useValue: topContributorsMock },
            { provide: GetTopMainContactPersonsService, useValue: topMainContactsMock },
            { provide: GetTopPartnersService, useValue: topPartnersMock },
            { provide: GetTopPrimaryLeversService, useValue: topLeversMock },
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
    expect(topContributorsMock.main).toHaveBeenCalledWith('C-1', 4);
    expect(topMainContactsMock.main).toHaveBeenCalledWith('C-1', 4);
    expect(topPartnersMock.main).toHaveBeenCalledWith('C-1', 4);
    expect(topLeversMock.main).toHaveBeenCalledWith('C-1', 4);
    expect(geoScopeMock.main).toHaveBeenCalledWith('C-1');
    expect(resultsCenterServiceMock.initializeProjectDashboardResultsTable).toHaveBeenCalledWith('C-1');
  });

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

    topContributorsMock.list.set([
      { contract_code: 'C-2', contract_description: 'Contributor', results_count: 1 },
      { project_name: 'Only project', count: 3 },
      { contract_id: 'C-3' },
      {}
    ]);
    topMainContactsMock.list.set([
      { name: 'Named', results_count: 1, email: 'named@example.com' },
      { full_name: 'Full Name', count: 2 },
      { contact_person_name: 'Contact Name', value: 3 },
      { label: 'Label Name' },
      { first_name: 'First', last_name: 'Last' },
      {}
    ]);
    topPartnersMock.list.set([
      { institution_id: 2, acronym: 'ABC', institution_name: 'Institution', results_count: 1 },
      { institution_id: null, partner_name: 'Partner', count: 2 },
      { institution_id: undefined, count: 3 },
      {}
    ]);
    topLeversMock.list.set([
      { lever_id: 1, short_name: 'RA', full_name: 'RA: Research area', count: 1, icon: 'icon.svg' },
      { lever_id: 2, short_name: 'L', full_name: 'L:', count: 3 },
      { lever_id: 3, short_name: '', full_name: '', count: 2 }
    ]);

    expect(component.contributorItems().map(item => item.label)).toEqual(['Only project', 'C-2 - Contributor', 'C-3', '—']);
    expect(component.mainContactPersonItems().map(item => item.label)).toEqual([
      'Contact Name',
      'Full Name',
      'Named',
      'Label Name',
      'First Last',
      '—'
    ]);
    expect(component.partnerItems().map(item => item.id)).toEqual(['2', 'Partner', '2', '3']);
    expect(component.partnerItems().map(item => item.label)).toContain('ABC - Institution');
    expect(component.leverItems().map(item => item.label)).toEqual(['L', '—', 'RA - RESEARCH AREA']);
  });

  it('should handle status response without result rows and lever labels with empty prefixes', async () => {
    await setup();
    apiMock.GET_Results.mockResolvedValueOnce({});

    await (component as any).loadProjectResultsByStatus('C-2');

    expect(component.statusChartItems()).toEqual([]);

    topLeversMock.list.set([{ lever_id: 4, short_name: 'RA', full_name: ': Research area', count: 1 }]);
    expect(component.leverItems()[0].label).toBe('RA - RESEARCH AREA');
  });

  it('should compute empty states from loading, error, and list signals', async () => {
    await setup();

    expect(component.contributorsEmpty()).toBe(true);
    expect(component.mainContactPersonsEmpty()).toBe(true);
    expect(component.partnersEmpty()).toBe(true);
    expect(component.leversEmpty()).toBe(true);

    topContributorsMock.loading.set(true);
    topMainContactsMock.loadError.set(true);
    topPartnersMock.list.set([{}]);
    topLeversMock.list.set([{}]);

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
