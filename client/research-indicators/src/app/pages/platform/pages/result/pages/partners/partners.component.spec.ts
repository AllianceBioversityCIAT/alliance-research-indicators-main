import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import PartnersComponent from './partners.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionsService } from '../../../../../../shared/services/actions.service';
import { CacheService } from '../../../../../../shared/services/cache/cache.service';
import { ApiService } from '../../../../../../shared/services/api.service';
import { AllModalsService } from '../../../../../../shared/services/cache/all-modals.service';
import { SubmissionService } from '../../../../../../shared/services/submission.service';
import { VersionWatcherService } from '../../../../../../shared/services/version-watcher.service';

describe('PartnersComponent', () => {
  let component: PartnersComponent;
  let fixture: ComponentFixture<PartnersComponent>;

  const mockActions = { showToast: jest.fn() };
  const mockCache = {
    getCurrentNumericResultId: jest.fn().mockReturnValue(7),
    currentResultId: jest.fn().mockReturnValue('ROAR-7'),
    currentResultIndicatorSectionPath: jest.fn().mockReturnValue('general-information')
  };
  const mockApi = {
    GET_Partners: jest.fn(),
    PATCH_Partners: jest.fn()
  };
  const mockModals = {
    setPartnerRequestSection: jest.fn(),
    openModal: jest.fn()
  };
  const mockSubmission = { isEditableStatus: jest.fn() };
  const mockVersionWatcher = { onVersionChange: jest.fn((cb: Function) => cb()) };
  const mockRouter = { navigate: jest.fn() } as unknown as Router;
  const makeRoute = (version: string | null) => ({
    snapshot: { queryParamMap: { get: (k: string) => (k === 'version' ? version : null) } }
  }) as unknown as ActivatedRoute;

  beforeEach(async () => {
    // default mocks
    mockApi.GET_Partners.mockResolvedValue({ data: { institutions: [] } });
    mockSubmission.isEditableStatus.mockReturnValue(false);

    await TestBed.configureTestingModule({
      imports: [PartnersComponent, HttpClientTestingModule],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActionsService, useValue: mockActions },
        { provide: CacheService, useValue: mockCache },
        { provide: ApiService, useValue: mockApi },
        { provide: AllModalsService, useValue: mockModals },
        { provide: SubmissionService, useValue: mockSubmission },
        { provide: VersionWatcherService, useValue: mockVersionWatcher },
        { provide: ActivatedRoute, useValue: makeRoute('1.0') }
      ]
    })
      .overrideComponent(PartnersComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(PartnersComponent);
    component = fixture.componentInstance;
    // inject real instances' private fields with our mocks
    (component as any).actions = mockActions as any;
    (component as any).cache = mockCache as any;
    (component as any).api = mockApi as any;
    (component as any).allModalsService = mockModals as any;
    (component as any).submission = mockSubmission as any;
    (component as any).versionWatcher = mockVersionWatcher as any;
    (component as any).router = mockRouter as any;
    (component as any).route = makeRoute('1.0') as any;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('canRemoveInstitution returns true for role 3 or null, false otherwise', () => {
    expect(component.canRemoveInstitution({ institution_role_id: 3 } as any)).toBe(true);
    expect(component.canRemoveInstitution({ institution_role_id: null } as any)).toBe(true);
    expect(component.canRemoveInstitution({ institution_role_id: 2 } as any)).toBe(false);
  });

  it('canRemove uses submission.isEditableStatus', () => {
    mockSubmission.isEditableStatus.mockReturnValueOnce(true);
    expect(component.canRemove()).toBe(true);
    mockSubmission.isEditableStatus.mockReturnValueOnce(false);
    expect(component.canRemove()).toBe(false);
  });

  it('getData should load partners, set body and optionsDisabled, toggle loading', async () => {
    mockApi.GET_Partners.mockResolvedValueOnce({
      data: {
        institutions: [
          { institution_role_id: 1 },
          { institution_role_id: 3 },
          { institution_role_id: 2 }
        ]
      }
    });
    await component.getData();
    expect(mockApi.GET_Partners).toHaveBeenCalledWith(7);
    expect(component.body().institutions.length).toBe(3);
    expect(component.optionsDisabled().map((i: any) => i.institution_role_id)).toEqual([1, 2]);
    expect(component.loading()).toBe(false);
  });

  it('saveData non-editable should skip PATCH and navigate based on page with version', async () => {
    mockSubmission.isEditableStatus.mockReturnValue(false);
    (component as any).route = makeRoute('1.0') as any;
    await component.saveData('back');
    expect(mockApi.PATCH_Partners).not.toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(
      ['result', 'ROAR-7', 'general-information'],
      { queryParams: { version: '1.0' }, replaceUrl: true }
    );

    jest.clearAllMocks();
    await component.saveData('next');
    expect(mockRouter.navigate).toHaveBeenCalledWith(
      ['result', 'ROAR-7', 'geographic-scope'],
      { queryParams: { version: '1.0' }, replaceUrl: true }
    );
  });

  it('saveData editable should PATCH and refresh data, then navigate; no version omits queryParams', async () => {
    mockSubmission.isEditableStatus.mockReturnValue(true);
    mockApi.PATCH_Partners.mockResolvedValueOnce({ successfulRequest: true });
    const getDataSpy = jest.spyOn(component, 'getData').mockResolvedValue();
    (component as any).route = makeRoute(null) as any;

    await component.saveData('next');
    expect(mockApi.PATCH_Partners).toHaveBeenCalledWith(7, component.body());
    expect(mockActions.showToast).toHaveBeenCalledWith({
      severity: 'success', summary: 'Partners', detail: 'Data saved successfully'
    });
    expect(getDataSpy).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(
      ['result', 'ROAR-7', 'geographic-scope'],
      { queryParams: undefined, replaceUrl: true }
    );
  });

  it('setSectionAndOpenModal should set section and open modal', () => {
    component.setSectionAndOpenModal('partners');
    expect(mockModals.setPartnerRequestSection).toHaveBeenCalledWith('partners');
    expect(mockModals.openModal).toHaveBeenCalledWith('requestPartner');
  });
});
