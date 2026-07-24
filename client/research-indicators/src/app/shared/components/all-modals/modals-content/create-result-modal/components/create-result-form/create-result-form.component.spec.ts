import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { CreateResultFormComponent } from './create-result-form.component';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { ApiService } from '@shared/services/api.service';
import { IndicatorsService } from '@shared/services/control-list/indicators.service';
import { GetContractsService } from '@shared/services/control-list/get-contracts.service';
import { GetResultsService } from '@shared/services/control-list/get-results.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { ActionsService } from '@shared/services/actions.service';
import { GetYearsService } from '@shared/services/control-list/get-years.service';
import { WordCountService } from '@shared/services/word-count.service';
import { CreateResultManagementService } from '../../services/create-result-management.service';

describe('CreateResultFormComponent', () => {
  let component: CreateResultFormComponent;
  let fixture: ComponentFixture<CreateResultFormComponent>;

  let router: Router;
  let apiServiceMock: any;
  let actionsServiceMock: any;
  let yearsServiceMock: any;
  let resultsServiceMock: any;
  let contractsServiceMock: any;
  let indicatorsServiceMock: any;
  let allModalsServiceMock: any;
  let cacheServiceMock: any;
  let createResultManagementServiceMock: any;
  let wordCountServiceMock: any;

  beforeEach(async () => {
    (globalThis as any).ResizeObserver = class {
      observe() {
        // intentionally left blank for testing
      }
      unobserve() {
        // intentionally left blank for testing
      }
      disconnect() {
        // intentionally left blank for testing
      }
    };

    apiServiceMock = {
      POST_Result: jest.fn(),
      GET_ValidateTitle: jest.fn(),
      GET_Results: jest.fn()
    } as Partial<ApiService> 

    actionsServiceMock = {
      showToast: jest.fn(),
      handleBadRequest: jest.fn(),
      showGlobalAlert: jest.fn()
    } as Partial<ActionsService> 

    const currentYear = new Date().getFullYear();
    yearsServiceMock = {
      list: jest.fn().mockReturnValue([{ report_year: currentYear }]),
      years: signal([{ report_year: currentYear }])
    } 

    resultsServiceMock = {
      updateList: jest.fn()
    } as Partial<GetResultsService> 

    contractsServiceMock = {
      list: signal([]),
      main: jest.fn().mockResolvedValue(undefined)
    } 

    indicatorsServiceMock = {
      indicatorsGrouped: jest.fn().mockReturnValue([])
    } 

    allModalsServiceMock = {
      closeModal: jest.fn(),
      openModal: jest.fn(),
      selectedResultForInfo: { set: jest.fn() }
    } as Partial<AllModalsService> 

    cacheServiceMock = {
      currentResultId: signal<number | null>(null)
    } as Partial<CacheService>

    createResultManagementServiceMock = {
      presetFromProjectResultsTable: jest.fn().mockReturnValue(false),
      contractId: jest.fn().mockReturnValue(null),
      setContractId: jest.fn(),
      setResultTitle: jest.fn(),
      setYear: jest.fn(),
      setModalTitle: jest.fn(),
      resultPageStep: signal(0),
      createOicrBody: {
        update: jest.fn()
      },
      oicrPrimaryOptionsDisabled: signal([]),
      updateOicrBody: jest.fn()
    } as Partial<CreateResultManagementService>;
    
    // Add update method to oicrPrimaryOptionsDisabled signal
    (createResultManagementServiceMock.oicrPrimaryOptionsDisabled as any).update = jest.fn((fn: any) => {
      const current = (createResultManagementServiceMock.oicrPrimaryOptionsDisabled as any)();
      const newValue = fn(current);
      (createResultManagementServiceMock.oicrPrimaryOptionsDisabled as any).set(newValue);
    });

    wordCountServiceMock = {
      getWordCount: jest.fn(),
      getWordCounterColor: jest.fn()
    } as Partial<WordCountService>

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, CreateResultFormComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() }, params: of({}) } },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: ActionsService, useValue: actionsServiceMock },
        { provide: GetYearsService, useValue: yearsServiceMock },
        { provide: GetResultsService, useValue: resultsServiceMock },
        { provide: GetContractsService, useValue: contractsServiceMock },
        { provide: IndicatorsService, useValue: indicatorsServiceMock },
        { provide: AllModalsService, useValue: allModalsServiceMock },
        { provide: CacheService, useValue: cacheServiceMock },
        { provide: CreateResultManagementService, useValue: createResultManagementServiceMock },
        { provide: WordCountService, useValue: wordCountServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateResultFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set current year on onYearsLoaded when available', () => {
    const currentYear = new Date().getFullYear();
    expect(component.body().year).toBe(currentYear);
  });

  it('should not set year when years list does not include current year', () => {
    yearsServiceMock.list.mockReturnValue([{ report_year: 1999 }]);
    // Recreate component so the effect re-evaluates with new mock
    const newFixture = TestBed.createComponent(CreateResultFormComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();
    expect(newComponent.body().year).toBeNull();
  });

  it('currentYear getter should return current calendar year', () => {
    expect(component.currentYear).toBe(new Date().getFullYear());
  });

  it('getters for missing fields should reflect body state', () => {
    component.body.set({ indicator_id: null, title: null, year: null, contract_id: null });
    expect(component.isYearMissing).toBe(true);
    expect(component.isTitleMissing).toBe(true);
    expect(component.isIndicatorIdMissing).toBe(true);
  });

  it('isDisabled should depend on sharedFormValid and body fields', () => {
    component.sharedFormValid = false;
    component.body.set({ indicator_id: 1, title: 't', contract_id: 2, year: 2024 });
    expect(component.isDisabled).toBe(true);

    component.sharedFormValid = true;
    component.body.set({ indicator_id: 1, title: 't', contract_id: 2, year: 2024 });
    expect(component.isDisabled).toBe(false);
  });

  it('onContractIdChange should update contractId and body', () => {
    component.onContractIdChange(123);
    expect(component.contractId).toBe(123);
    expect(component.body().contract_id).toBe(123);
  });

  it('navigateToOicr should set management values and step 2', () => {
    const management = (component as any).createResultManagementService;
    management.setContractId = jest.fn();
    management.setResultTitle = jest.fn();
    management.setYear = jest.fn();
    management.setModalTitle = jest.fn();
    management.resultPageStep = signal(0);

    component.body.update(b => ({ ...b, title: 'Title', contract_id: 77, year: 2024 }));
    component.navigateToOicr();

    expect(management.setContractId).toHaveBeenCalledWith(77);
    expect(management.setResultTitle).toHaveBeenCalledWith('Title');
    expect(management.setYear).toHaveBeenCalledWith(2024);
    expect(management.setModalTitle).toHaveBeenCalledWith('Outcome Impact Case Report (OICR)');
    expect(management.resultPageStep()).toBe(2);
  });

  it('createResult should call successRequest on successful response', async () => {
    const spy = jest.spyOn(component, 'successRequest');
    apiServiceMock.POST_Result.mockResolvedValue({ successfulRequest: true, data: { result_official_code: '555' } });
    await component.createResult(true);
    expect(spy).toHaveBeenCalled();
    expect(component.loading).toBe(false);
  });

  it('createResult should call handleBadRequest on failure', async () => {
    apiServiceMock.POST_Result.mockResolvedValue({ successfulRequest: false });
    await component.createResult(true);
    expect(actionsServiceMock.handleBadRequest).toHaveBeenCalled();
    expect(component.loading).toBe(false);
  });

  it('successRequest should reset state and optionally navigate/close modal', async () => {
    const currentYear = new Date().getFullYear();
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true as any);
    const result = { data: { result_official_code: '999' } } as any;

    // with openresult = false
    component.body.update(b => ({ ...b, title: 'Some Title' }));
    component.successRequest(result, false);
    expect(actionsServiceMock.showToast).toHaveBeenCalled();
    expect(component.body().year).toBe(currentYear);
    expect(component.sharedFormValid).toBe(false);
    expect(resultsServiceMock.updateList).toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();

    // with openresult = true (STAR -> navigate)
    component.body.update(b => ({ ...b, title: 'Another Title' }));
    component.successRequest(result, true);
    expect(cacheServiceMock.currentResultId()).toBe(999);
    expect(navigateSpy).toHaveBeenCalledWith(['result', 'STAR-999'], { replaceUrl: true });
    expect(allModalsServiceMock.closeModal).toHaveBeenCalledWith('createResult');
  });

  it('successRequest with openresult true and non-STAR platform should open result info modal', () => {
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true as any);
    const resultData = { result_official_code: '123', platform_code: 'TIP', title: 'Tip Result' };
    const result = { data: resultData } as any;

    component.successRequest(result, true);

    expect((allModalsServiceMock as any).selectedResultForInfo.set).toHaveBeenCalledWith(resultData);
    expect(allModalsServiceMock.openModal).toHaveBeenCalledWith('resultInformation');
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(allModalsServiceMock.closeModal).toHaveBeenCalledWith('createResult');
  });

  describe('openExistingResultModal', () => {
    it('should set selectedResultForInfo and open modal when response has data', async () => {
      const resultItem = {
        result_official_code: 456,
        platform_code: 'TIP',
        title: 'Existing',
        result_id: 1
      };
      apiServiceMock.GET_Results!.mockResolvedValue({ data: { results: [resultItem], total: 1 } } as any);

      await component.openExistingResultModal('TIP', '456');

      expect(apiServiceMock.GET_Results).toHaveBeenCalled();
      expect((allModalsServiceMock as any).selectedResultForInfo.set).toHaveBeenCalledWith(
        expect.objectContaining({
          result_official_code: '456',
          platform_code: 'TIP',
          title: 'Existing'
        })
      );
      expect(allModalsServiceMock.openModal).toHaveBeenCalledWith('resultInformation');
    });

    it('should find correct result when response has multiple results', async () => {
      const first = { result_official_code: '111', platform_code: 'TIP', title: 'First', result_id: 1 };
      const second = { result_official_code: '999', platform_code: 'TIP', title: 'Target', result_id: 2 };
      const third = { result_official_code: '999', platform_code: 'PRMS', title: 'Other platform', result_id: 3 };
      apiServiceMock.GET_Results!.mockResolvedValue({ data: { results: [first, second, third], total: 3 } } as any);

      await component.openExistingResultModal('TIP', '999');

      expect((allModalsServiceMock as any).selectedResultForInfo.set).toHaveBeenCalledWith(
        expect.objectContaining({
          result_official_code: '999',
          platform_code: 'TIP',
          title: 'Target'
        })
      );
      expect(allModalsServiceMock.openModal).toHaveBeenCalledWith('resultInformation');
    });

    it('should use single result when find returns undefined (list.length === 1 fallback)', async () => {
      const single = { result_official_code: '111', platform_code: 'TIP', title: 'Only One', result_id: 1 };
      apiServiceMock.GET_Results!.mockResolvedValue({ data: { results: [single], total: 1 } } as any);

      await component.openExistingResultModal('TIP', '999');

      expect((allModalsServiceMock as any).selectedResultForInfo.set).toHaveBeenCalledWith(
        expect.objectContaining({
          result_official_code: '111',
          platform_code: 'TIP',
          title: 'Only One'
        })
      );
      expect(allModalsServiceMock.openModal).toHaveBeenCalledWith('resultInformation');
    });

    it('should not open modal when find returns undefined and list has multiple items', async () => {
      const a = { result_official_code: '111', platform_code: 'TIP', title: 'A', result_id: 1 };
      const b = { result_official_code: '222', platform_code: 'TIP', title: 'B', result_id: 2 };
      apiServiceMock.GET_Results!.mockResolvedValue({ data: { results: [a, b], total: 2 } } as any);

      await component.openExistingResultModal('TIP', '999');

      expect((allModalsServiceMock as any).selectedResultForInfo.set).not.toHaveBeenCalled();
      expect(allModalsServiceMock.openModal).not.toHaveBeenCalled();
    });

    it('should set normalized result with snapshot_years array when present', async () => {
      const resultItem = {
        result_official_code: 888,
        platform_code: 'TIP',
        title: 'With snapshot years',
        result_id: 5,
        snapshot_years: [2024, 2025]
      };
      apiServiceMock.GET_Results!.mockResolvedValue({ data: { results: [resultItem], total: 1 } } as any);

      await component.openExistingResultModal('TIP', '888');

      expect((allModalsServiceMock as any).selectedResultForInfo.set).toHaveBeenCalledWith(
        expect.objectContaining({
          result_official_code: '888',
          platform_code: 'TIP',
          snapshot_years: [2024, 2025]
        })
      );
    });

    it('should not open modal when response.data is null', async () => {
      apiServiceMock.GET_Results!.mockResolvedValue({ data: null } as any);

      await component.openExistingResultModal('TIP', '999');

      expect((allModalsServiceMock as any).selectedResultForInfo.set).not.toHaveBeenCalled();
      expect(allModalsServiceMock.openModal).not.toHaveBeenCalled();
    });

    it('should not open modal when data is empty', async () => {
      apiServiceMock.GET_Results!.mockResolvedValue({ data: { results: [], total: 0 } } as any);

      await component.openExistingResultModal('TIP', '999');

      expect((allModalsServiceMock as any).selectedResultForInfo.set).not.toHaveBeenCalled();
      expect(allModalsServiceMock.openModal).not.toHaveBeenCalled();
    });

    it('should ignore fetch errors and not open modal', async () => {
      apiServiceMock.GET_Results!.mockRejectedValue(new Error('Network error'));

      await component.openExistingResultModal('TIP', '999');

      expect((allModalsServiceMock as any).selectedResultForInfo.set).not.toHaveBeenCalled();
      expect(allModalsServiceMock.openModal).not.toHaveBeenCalled();
    });
  });

  it('getWordCount and getWordCounterColor should work as expected', () => {
    component.body.update(b => ({ ...b, title: '' }));
    expect(component.getWordCount()).toBe(0);
    expect(component.getWordCounterColor()).toBe('#8d9299');

    const words = Array(31).fill('w').join(' ');
    component.body.update(b => ({ ...b, title: words }));
    expect(component.getWordCount()).toBe(31);
    expect(component.getWordCounterColor()).toBe('#CF0808');

    component.body.update(b => ({ ...b, title: 'one two' }));
    expect(component.getWordCounterColor()).toBe('#358540');
  });

  it('truncateTitle should handle limits and empty strings', () => {
    expect(component.truncateTitle('')).toBe('');
    const text = Array(10).fill('word').join(' ');
    expect(component.truncateTitle(text)).toBe(text);
    const longText = Array(40).fill('word').join(' ');
    expect(component.truncateTitle(longText, 30)).toBe(Array(30).fill('word').join(' ') + '...');
  });

  it('should handle syncPresetContractId effect when preset is true', () => {
    createResultManagementServiceMock.presetFromProjectResultsTable.mockReturnValue(true);
    createResultManagementServiceMock.contractId.mockReturnValue('123');
    
    // Recreate component to trigger effect
    const newFixture = TestBed.createComponent(CreateResultFormComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();
    
    expect(newComponent.contractId).toBe('123');
    expect(newComponent.body().contract_id).toBe('123');
  });

  it('should handle syncPresetContractId effect when preset is false', () => {
    createResultManagementServiceMock.presetFromProjectResultsTable.mockReturnValue(false);
    
    // Recreate component to trigger effect
    const newFixture = TestBed.createComponent(CreateResultFormComponent);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();
    
    expect(newComponent.contractId).toBe(null);
    expect(newComponent.body().contract_id).toBe(null);
  });

  it('onIndicatorChange should update indicator_id and call maybeShowW1W2Alert', () => {
    const spy = jest.spyOn(component as any, 'maybeShowW1W2Alert');
    component.onIndicatorChange(5);
    expect(component.body().indicator_id).toBe(5);
    expect(spy).toHaveBeenCalled();
  });

  it('isW1W2NonOicr should return true for W1/W2 non-OICR combinations', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', is_science_program: true } as any
    ]);
    component.body.set({ indicator_id: 1, contract_id: '123' });
    expect((component as any).isW1W2NonOicr()).toBe(true);
  });

  it('isW1W2NonOicr should return false for OICR indicators', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', is_science_program: true } as any
    ]);
    component.body.set({ indicator_id: 5, contract_id: '123' });
    expect((component as any).isW1W2NonOicr()).toBe(false);
  });

  it('isW1W2NonOicr should return false for non-W1/W2 contracts', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', is_science_program: false } as any
    ]);
    component.body.set({ indicator_id: 1, contract_id: '123' });
    expect((component as any).isW1W2NonOicr()).toBe(false);
  });

  it('isW1W2NonOicr should return false when missing indicator or contract', () => {
    component.body.set({ indicator_id: null, contract_id: '123' });
    expect((component as any).isW1W2NonOicr()).toBe(false);
    
    component.body.set({ indicator_id: 1, contract_id: null });
    expect((component as any).isW1W2NonOicr()).toBe(false);
  });

  it('maybeShowW1W2Alert should show alert when W1/W2 non-OICR condition is met', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', is_science_program: true } as any
    ]);
    component.body.set({ indicator_id: 1, contract_id: '123' });
    
    component.onIndicatorChange(1);
    expect(actionsServiceMock.showGlobalAlert).toHaveBeenCalled();
  });

  it('maybeShowW1W2Alert should not show alert when condition is not met', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', is_science_program: false } as any
    ]);
    component.body.set({ indicator_id: 1, contract_id: '123' });
    
    component.onIndicatorChange(1);
    expect(actionsServiceMock.showGlobalAlert).not.toHaveBeenCalled();
  });

  it('getPrimaryLeverId should return lever_id from contract', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', lever_id: 456 } as any
    ]);
    expect(component.getPrimaryLeverId('123')).toBe(456);
  });

  it('getPrimaryLeverId should return undefined when contract not found', () => {
    contractsServiceMock.list.set([]);
    expect(component.getPrimaryLeverId('999')).toBeUndefined();
  });

  it('getPrimaryLeverForOicr should return array with lever when getPrimaryLeverId returns value', () => {
    component.body.set({ contract_id: '123' } as any);
    contractsServiceMock.list.set([{ agreement_id: '123', lever_id: 456 }] as any);
    expect(component.getPrimaryLeverForOicr()).toEqual([
      { result_lever_id: 0, result_id: 0, lever_id: 456, lever_role_id: 0, is_primary: true }
    ]);
  });

  it('getPrimaryLeverForOicr should return empty array when getPrimaryLeverId returns falsy', () => {
    component.body.set({ contract_id: '999' } as any);
    contractsServiceMock.list.set([]);
    expect(component.getPrimaryLeverForOicr()).toEqual([]);
  });

  it('CreateOicr should navigate to OICR when title is valid', async () => {
    const spy = jest.spyOn(component, 'navigateToOicr');
    apiServiceMock.GET_ValidateTitle.mockResolvedValue({ successfulRequest: true, data: { isValid: true } });
    
    await component.CreateOicr();
    expect(spy).toHaveBeenCalled();
  });

  it('CreateOicr should show alert when title already exists', async () => {
    apiServiceMock.GET_ValidateTitle.mockResolvedValue({ successfulRequest: true, data: { isValid: false } });
    
    await component.CreateOicr();
    expect(actionsServiceMock.showGlobalAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'secondary',
        summary: 'Title Already Exists',
        detail: 'Please enter a different title.',
        hasNoCancelButton: true,
        generalButton: true,
        buttonColor: '#035BA9'
      })
    );
  });

  it('CreateOicr should show alert with result link when title exists and platform is STAR', async () => {
    apiServiceMock.GET_ValidateTitle.mockResolvedValue({
      successfulRequest: true,
      data: { isValid: false, result_official_code: '999', platform_code: 'STAR' }
    });
    await component.CreateOicr();

    expect(actionsServiceMock.showGlobalAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Title Already Exists',
        detail: expect.stringContaining('result/STAR-999/general-information')
      })
    );
    const alertArg = (actionsServiceMock.showGlobalAlert as jest.Mock).mock.calls[0][0];
    expect(alertArg.onDetailLinkClick).toBeUndefined();
  });

  it('CreateOicr should pass onDetailLinkClick for non-STAR when title exists and invoke openExistingResultModal', async () => {
    apiServiceMock.GET_ValidateTitle.mockResolvedValue({
      successfulRequest: true,
      data: { isValid: false, result_official_code: 456, platform_code: 'TIP' }
    });
    const openExistingSpy = jest.spyOn(component, 'openExistingResultModal').mockResolvedValue();
    await component.CreateOicr();

    const alertArg = (actionsServiceMock.showGlobalAlert as jest.Mock).mock.calls[0][0];
    expect(alertArg.onDetailLinkClick).toBeDefined();
    alertArg.onDetailLinkClick();
    await Promise.resolve();
    expect(openExistingSpy).toHaveBeenCalledWith('TIP', '456');
  });

  it('createResult should pass onOpenExistingResult to handleBadRequest and call openExistingResultModal when invoked', async () => {
    apiServiceMock.POST_Result.mockResolvedValue({
      successfulRequest: false,
      errorDetail: {
        description: 'Exists',
        errors: { result_official_code: 789, platform_code: 'TIP' }
      }
    } as any);

    await component.createResult(true);

    expect(actionsServiceMock.handleBadRequest).toHaveBeenCalledWith(
      expect.any(Object),
      undefined,
      expect.objectContaining({ onOpenExistingResult: expect.any(Function) })
    );
    const options = (actionsServiceMock.handleBadRequest as jest.Mock).mock.calls[0][2];
    const openExistingSpy = jest.spyOn(component, 'openExistingResultModal').mockResolvedValue();
    await options.onOpenExistingResult('TIP', '789');
    expect(openExistingSpy).toHaveBeenCalledWith('TIP', '789');
  });

  it('navigateToOicr should set all management service values and update OICR body', () => {
    component.body.set({ title: 'Test Title', contract_id: '123', year: 2024 });
    contractsServiceMock.list.set([
      { agreement_id: '123', lever_id: 456 } as any
    ]);
    
    component.navigateToOicr();
    
    expect(createResultManagementServiceMock.setContractId).toHaveBeenCalledWith('123');
    expect(createResultManagementServiceMock.setResultTitle).toHaveBeenCalledWith('Test Title');
    expect(createResultManagementServiceMock.setYear).toHaveBeenCalledWith(2024);
    expect(createResultManagementServiceMock.setModalTitle).toHaveBeenCalledWith('Outcome Impact Case Report (OICR)');
    expect(createResultManagementServiceMock.createOicrBody.update).toHaveBeenCalled();
  });

  it('navigateToOicr should handle case when no primary lever is found', () => {
    component.body.set({ title: 'Test Title', contract_id: '999', year: 2024 });
    contractsServiceMock.list.set([]);
    
    component.navigateToOicr();
    
    expect(createResultManagementServiceMock.setContractId).toHaveBeenCalledWith('999');
    expect(createResultManagementServiceMock.setResultTitle).toHaveBeenCalledWith('Test Title');
    expect(createResultManagementServiceMock.setYear).toHaveBeenCalledWith(2024);
  });

  it('buildW1W2RestrictionHtml should generate proper HTML content', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', select_label: 'Project Name - Description' } as any
    ]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([
      { indicators: [{ indicator_id: 1, name: 'Test Indicator' }] }
    ]);
    
    component.body.set({ contract_id: '123', indicator_id: 1 });
    
    const html = (component as any).buildW1W2RestrictionHtml();
    expect(html).toContain('Project Name');
    expect(html).toContain('Test Indicator');
    expect(html).toContain('W1/W2 pooled funding');
    expect(html).toContain('Alliance-SPRM@cgiar.org');
  });

  it('buildW1W2RestrictionHtml should handle missing contract and indicator', () => {
    contractsServiceMock.list.set([]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([]);
    
    component.body.set({ contract_id: '999', indicator_id: 999 });
    
    const html = (component as any).buildW1W2RestrictionHtml();
    expect(html).toContain('selected');
    expect(html).toContain('W1/W2 pooled funding');
  });

  it('isDisabled should return true when W1/W2 non-OICR condition is met', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', is_science_program: true } as any
    ]);
    component.body.set({ indicator_id: 1, title: 'Test', contract_id: '123', year: 2024 });
    component.sharedFormValid = true;
    
    expect(component.isDisabled).toBe(true);
  });

  it('isDisabled should return false when all conditions are met and no W1/W2 restriction', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', is_science_program: false } as any
    ]);
    component.body.set({ indicator_id: 1, title: 'Test', contract_id: '123', year: 2024 });
    component.sharedFormValid = true;
    
    expect(component.isDisabled).toBe(false);
  });

  it('should execute PRMS callback when W1/W2 alert is shown', () => {
    const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    contractsServiceMock.list.set([
      { agreement_id: '123', is_science_program: true } as any
    ]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([
      { indicators: [{ indicator_id: 1, name: 'Test Indicator' }] }
    ]);
    
    component.body.set({ indicator_id: 1, contract_id: '123' });
    component.onIndicatorChange(1);
    
    // Get the callback from the alert call
    const alertCall = actionsServiceMock.showGlobalAlert.mock.calls[0][0];
    const prmsCallback = alertCall.confirmCallback.event;
    
    // Execute the callback
    prmsCallback();
    
    expect(windowOpenSpy).toHaveBeenCalledWith(component.prmsUrl, '_blank');
    windowOpenSpy.mockRestore();
  });

  it('should execute title callback when title already exists alert is shown', async () => {
    const callbackSpy = jest.fn();
    apiServiceMock.GET_ValidateTitle.mockResolvedValue({ successfulRequest: true, data: { isValid: false } });
    
    await component.CreateOicr();
    
    // Get the callback from the alert call
    const alertCall = actionsServiceMock.showGlobalAlert.mock.calls[0][0];
    const titleCallback = alertCall.confirmCallback.event;
    
    // Execute the callback
    titleCallback();
    
    // The callback should execute without error (it's a no-op function)
    expect(titleCallback).toBeDefined();
  });

  it('should handle buildW1W2RestrictionHtml with missing project names', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', funding_type: 'W1/W2', project_name: null } as any
    ]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([
      { indicators: [{ indicator_id: 1, name: 'Test Indicator' }] }
    ]);
    
    component.body.set({ indicator_id: 1, contract_id: '123' });
    const result = component.buildW1W2RestrictionHtml();
    
    expect(result).toContain('You selected');
    expect(result).toContain('Test Indicator');
  });

  it('should handle buildW1W2RestrictionHtml with empty project names', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', funding_type: 'W1/W2', project_name: '' } as any
    ]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([
      { indicators: [{ indicator_id: 1, name: 'Test Indicator' }] }
    ]);
    
    component.body.set({ indicator_id: 1, contract_id: '123' });
    const result = component.buildW1W2RestrictionHtml();
    
    expect(result).toContain('You selected');
    expect(result).toContain('Test Indicator');
  });

  it('should handle buildW1W2RestrictionHtml with missing indicator', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', funding_type: 'W1/W2', project_name: 'Test Project' } as any
    ]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([
      { indicators: [] }
    ]);
    
    component.body.set({ indicator_id: 999, contract_id: '123' });
    const result = component.buildW1W2RestrictionHtml();
    
    expect(result).toContain('You selected');
    expect(result).toContain('selected');
  });

  it('should handle navigateToOicr with empty body values', () => {
    component.body.set({ title: '', contract_id: '', year: '' });
    contractsServiceMock.list.set([
      { agreement_id: '123', lever_id: 1 } as any
    ]);
    
    component.navigateToOicr();
    
    expect(createResultManagementServiceMock.setContractId).toHaveBeenCalledWith('');
    expect(createResultManagementServiceMock.setResultTitle).toHaveBeenCalledWith('');
    expect(createResultManagementServiceMock.setYear).toHaveBeenCalledWith('');
    expect(createResultManagementServiceMock.createOicrBody.update).toHaveBeenCalled();
  });

  it('should handle navigateToOicr with null body values', () => {
    component.body.set({ title: null, contract_id: null, year: null });
    contractsServiceMock.list.set([
      { agreement_id: '123', lever_id: 1 } as any
    ]);
    
    component.navigateToOicr();
    
    expect(createResultManagementServiceMock.setContractId).toHaveBeenCalledWith(null);
    expect(createResultManagementServiceMock.setResultTitle).toHaveBeenCalledWith(null);
    expect(createResultManagementServiceMock.setYear).toHaveBeenCalledWith(null);
    expect(createResultManagementServiceMock.createOicrBody.update).toHaveBeenCalled();
  });

  it('should handle navigateToOicr with undefined body values', () => {
    component.body.set({ title: undefined, contract_id: undefined, year: undefined });
    contractsServiceMock.list.set([
      { agreement_id: '123', lever_id: 1 } as any
    ]);
    
    component.navigateToOicr();
    
    expect(createResultManagementServiceMock.setContractId).toHaveBeenCalledWith(undefined);
    expect(createResultManagementServiceMock.setResultTitle).toHaveBeenCalledWith(undefined);
    expect(createResultManagementServiceMock.setYear).toHaveBeenCalledWith(undefined);
    expect(createResultManagementServiceMock.createOicrBody.update).toHaveBeenCalled();
  });

  it('should handle buildW1W2RestrictionHtml with null project names', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', funding_type: 'W1/W2', project_name: null } as any
    ]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([
      { indicators: [{ indicator_id: 1, name: 'Test Indicator' }] }
    ]);
    
    component.body.set({ indicator_id: 1, contract_id: '123' });
    const result = component.buildW1W2RestrictionHtml();
    
    expect(result).toContain('You selected');
    expect(result).toContain('Test Indicator');
  });

  it('should handle buildW1W2RestrictionHtml with undefined project names', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', funding_type: 'W1/W2', project_name: undefined } as any
    ]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([
      { indicators: [{ indicator_id: 1, name: 'Test Indicator' }] }
    ]);
    
    component.body.set({ indicator_id: 1, contract_id: '123' });
    const result = component.buildW1W2RestrictionHtml();
    
    expect(result).toContain('You selected');
    expect(result).toContain('Test Indicator');
  });

  it('should handle buildW1W2RestrictionHtml with null indicator name', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', funding_type: 'W1/W2', project_name: 'Test Project' } as any
    ]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([
      { indicators: [{ indicator_id: 1, name: null }] }
    ]);
    
    component.body.set({ indicator_id: 1, contract_id: '123' });
    const result = component.buildW1W2RestrictionHtml();
    
    expect(result).toContain('You selected');
    expect(result).toContain('selected');
  });

  it('should handle buildW1W2RestrictionHtml with undefined indicator name', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', funding_type: 'W1/W2', project_name: 'Test Project' } as any
    ]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([
      { indicators: [{ indicator_id: 1, name: undefined }] }
    ]);
    
    component.body.set({ indicator_id: 1, contract_id: '123' });
    const result = component.buildW1W2RestrictionHtml();
    
    expect(result).toContain('You selected');
    expect(result).toContain('selected');
  });

  it('should handle navigateToOicr with null contract_id in body', () => {
    component.body.set({ title: 'Test', contract_id: null, year: 2024 });
    contractsServiceMock.list.set([
      { agreement_id: '123', lever_id: 1 } as any
    ]);
    
    component.navigateToOicr();
    
    expect(createResultManagementServiceMock.setContractId).toHaveBeenCalledWith(null);
    expect(createResultManagementServiceMock.setResultTitle).toHaveBeenCalledWith('Test');
    expect(createResultManagementServiceMock.setYear).toHaveBeenCalledWith(2024);
    expect(createResultManagementServiceMock.createOicrBody.update).toHaveBeenCalled();
  });

  it('should handle navigateToOicr with undefined contract_id in body', () => {
    component.body.set({ title: 'Test', contract_id: undefined, year: 2024 });
    contractsServiceMock.list.set([
      { agreement_id: '123', lever_id: 1 } as any
    ]);
    
    component.navigateToOicr();
    
    expect(createResultManagementServiceMock.setContractId).toHaveBeenCalledWith(undefined);
    expect(createResultManagementServiceMock.setResultTitle).toHaveBeenCalledWith('Test');
    expect(createResultManagementServiceMock.setYear).toHaveBeenCalledWith(2024);
    expect(createResultManagementServiceMock.createOicrBody.update).toHaveBeenCalled();
  });

  it('should handle buildW1W2RestrictionHtml with empty string project names', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', funding_type: 'W1/W2', project_name: '' } as any
    ]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([
      { indicators: [{ indicator_id: 1, name: 'Test Indicator' }] }
    ]);
    
    component.body.set({ indicator_id: 1, contract_id: '123' });
    const result = component.buildW1W2RestrictionHtml();
    
    expect(result).toContain('You selected');
    expect(result).toContain('Test Indicator');
  });

  it('should handle buildW1W2RestrictionHtml with empty string indicator name', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', funding_type: 'W1/W2', project_name: 'Test Project' } as any
    ]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([
      { indicators: [{ indicator_id: 1, name: '' }] }
    ]);
    
    component.body.set({ indicator_id: 1, contract_id: '123' });
    const result = component.buildW1W2RestrictionHtml();
    
    expect(result).toContain('You selected');
    expect(result).toContain('selected');
  });

  it('should handle navigateToOicr with empty string contract_id in body', () => {
    component.body.set({ title: 'Test', contract_id: '', year: 2024 });
    contractsServiceMock.list.set([
      { agreement_id: '123', lever_id: 1 } as any
    ]);
    
    component.navigateToOicr();
    
    expect(createResultManagementServiceMock.setContractId).toHaveBeenCalledWith('');
    expect(createResultManagementServiceMock.setResultTitle).toHaveBeenCalledWith('Test');
    expect(createResultManagementServiceMock.setYear).toHaveBeenCalledWith(2024);
    expect(createResultManagementServiceMock.createOicrBody.update).toHaveBeenCalled();
  });

  it('buildW1W2RestrictionHtml should handle contract with projectSecond part', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', select_label: 'First Part - Second Part - Third Part' } as any
    ]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([
      { indicators: [{ indicator_id: 1, name: 'Test Indicator' }] }
    ]);
    
    component.body.set({ contract_id: '123', indicator_id: 1 });
    
    const html = (component as any).buildW1W2RestrictionHtml();
    expect(html).toContain('First Part');
    expect(html).toContain('Second Part - Third Part');
    expect(html).toContain('Test Indicator');
  });

  it('buildW1W2RestrictionHtml should handle contract without projectSecond part', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', select_label: 'Single Project Name' } as any
    ]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([
      { indicators: [{ indicator_id: 1, name: 'Test Indicator' }] }
    ]);
    
    component.body.set({ contract_id: '123', indicator_id: 1 });
    
    const html = (component as any).buildW1W2RestrictionHtml();
    expect(html).toContain('Single Project Name');
    expect(html).not.toContain(' - ');
    expect(html).toContain('Test Indicator');
  });

  it('buildW1W2RestrictionHtml should handle contract found in list', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', select_label: 'Project Name' } as any,
      { agreement_id: '456', select_label: 'Other Project' } as any
    ]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([
      { indicators: [{ indicator_id: 1, name: 'Test Indicator' }] }
    ]);
    
    component.body.set({ contract_id: '123', indicator_id: 1 });
    
    const html = (component as any).buildW1W2RestrictionHtml();
    expect(html).toContain('Project Name');
    expect(html).toContain('Test Indicator');
  });

  it('buildW1W2RestrictionHtml should handle groups with indicators array', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', select_label: 'Project Name' } as any
    ]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([
      { indicators: [{ indicator_id: 1, name: 'Indicator 1' }] },
      { indicators: [{ indicator_id: 2, name: 'Indicator 2' }] }
    ]);
    
    component.body.set({ contract_id: '123', indicator_id: 2 });
    
    const html = (component as any).buildW1W2RestrictionHtml();
    expect(html).toContain('Indicator 2');
  });

  it('buildW1W2RestrictionHtml should handle groups with null indicators', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', select_label: 'Project Name' } as any
    ]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([
      { indicators: null },
      { indicators: [{ indicator_id: 1, name: 'Indicator 1' }] }
    ]);
    
    component.body.set({ contract_id: '123', indicator_id: 1 });
    
    const html = (component as any).buildW1W2RestrictionHtml();
    expect(html).toContain('Indicator 1');
  });

  it('buildW1W2RestrictionHtml should handle groups with undefined indicators', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', select_label: 'Project Name' } as any
    ]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([
      { indicators: undefined },
      { indicators: [{ indicator_id: 1, name: 'Indicator 1' }] }
    ]);
    
    component.body.set({ contract_id: '123', indicator_id: 1 });
    
    const html = (component as any).buildW1W2RestrictionHtml();
    expect(html).toContain('Indicator 1');
  });

  it('navigateToOicr should include primary_lever when getPrimaryLeverId returns a value', () => {
    component.body.set({ title: 'Test Title', contract_id: '123', year: 2024 });
    contractsServiceMock.list.set([
      { agreement_id: '123', lever_id: 456 } as any
    ]);
    
    component.navigateToOicr();
    
    expect(createResultManagementServiceMock.setContractId).toHaveBeenCalledWith('123');
    expect(createResultManagementServiceMock.setResultTitle).toHaveBeenCalledWith('Test Title');
    expect(createResultManagementServiceMock.setYear).toHaveBeenCalledWith(2024);
    expect(createResultManagementServiceMock.createOicrBody.update).toHaveBeenCalled();
    
    // Verify that the update callback includes primary_lever (covers line 252 lever_id: Number(...))
    const updateCall = createResultManagementServiceMock.createOicrBody.update.mock.calls[0][0];
    const mockBody = { base_information: {}, step_two: {} };
    const result = updateCall(mockBody);
    expect(result.step_two.primary_lever).toEqual([
      {
        result_lever_id: 0,
        result_id: 0,
        lever_id: 456,
        lever_role_id: 0,
        is_primary: true
      }
    ]);
    expect(typeof (result.step_two.primary_lever as any[])[0].lever_id).toBe('number');
  });

  it('navigateToOicr should set lever_id via Number() when getPrimaryLeverId returns string number (cover line 252 branch)', () => {
    component.body.set({ title: 'T', contract_id: '123', year: 2024 });
    contractsServiceMock.list.set([
      { agreement_id: '123', lever_id: '789' } as any
    ]);
    component.navigateToOicr();
    const updateCall = createResultManagementServiceMock.createOicrBody.update.mock.calls[0][0];
    const result = updateCall({ base_information: {}, step_two: {} });
    expect((result.step_two.primary_lever as any[])[0].lever_id).toBe(789);
  });

  it('navigateToOicr should handle when body values are falsy and use empty strings', () => {
    component.body.set({ title: null, contract_id: null, year: null });
    contractsServiceMock.list.set([
      { agreement_id: '123', lever_id: 456 } as any
    ]);
    
    component.navigateToOicr();
    
    expect(createResultManagementServiceMock.createOicrBody.update).toHaveBeenCalled();
    
    // Verify that the update callback uses empty strings for falsy values
    const updateCall = createResultManagementServiceMock.createOicrBody.update.mock.calls[0][0];
    const mockBody = { base_information: {}, step_two: {} };
    const result = updateCall(mockBody);
    expect(result.base_information.title).toBe('');
    expect(result.base_information.contract_id).toBe('');
    expect(result.base_information.year).toBe('');
  });

  it('navigateToOicr should handle when body values are undefined and use empty strings', () => {
    component.body.set({ title: undefined, contract_id: undefined, year: undefined });
    contractsServiceMock.list.set([
      { agreement_id: '123', lever_id: 456 } as any
    ]);
    
    component.navigateToOicr();
    
    expect(createResultManagementServiceMock.createOicrBody.update).toHaveBeenCalled();
    
    // Verify that the update callback uses empty strings for undefined values
    const updateCall = createResultManagementServiceMock.createOicrBody.update.mock.calls[0][0];
    const mockBody = { base_information: {}, step_two: {} };
    const result = updateCall(mockBody);
    expect(result.base_information.title).toBe('');
    expect(result.base_information.contract_id).toBe('');
    expect(result.base_information.year).toBe('');
  });

  it('navigateToOicr should handle when contract_id is empty string in getPrimaryLeverId call', () => {
    component.body.set({ title: 'Test', contract_id: '', year: 2024 });
    contractsServiceMock.list.set([]);
    
    component.navigateToOicr();
    
    expect(createResultManagementServiceMock.createOicrBody.update).toHaveBeenCalled();
    
    // Verify that getPrimaryLeverId is called with empty string
    const updateCall = createResultManagementServiceMock.createOicrBody.update.mock.calls[0][0];
    const mockBody = { base_information: {}, step_two: {} };
    const result = updateCall(mockBody);
    expect(result.step_two.primary_lever).toEqual([]);
  });

  it('navigateToOicr should set empty primary_lever when getPrimaryLeverId returns undefined', () => {
    component.body.set({ title: 'Test Title', contract_id: '999', year: 2024 });
    contractsServiceMock.list.set([]);
    
    component.navigateToOicr();
    
    expect(createResultManagementServiceMock.createOicrBody.update).toHaveBeenCalled();
    
    // Verify that the update callback includes empty primary_lever
    const updateCall = createResultManagementServiceMock.createOicrBody.update.mock.calls[0][0];
    const mockBody = { base_information: {}, step_two: {} };
    const result = updateCall(mockBody);
    expect(result.step_two.primary_lever).toEqual([]);
  });

  it('buildW1W2RestrictionHtml should handle when indicators function exists', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', select_label: 'Project Name' } as any
    ]);
    const indicatorsFn = jest.fn().mockReturnValue([
      { indicators: [{ indicator_id: 1, name: 'Test Indicator' }] }
    ]);
    (indicatorsServiceMock as any).indicators = indicatorsFn;
    
    component.body.set({ contract_id: '123', indicator_id: 1 });
    
    const html = (component as any).buildW1W2RestrictionHtml();
    expect(html).toContain('Test Indicator');
    expect(indicatorsFn).toHaveBeenCalled();
  });

  it('buildW1W2RestrictionHtml should handle when indicators function does not exist', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', select_label: 'Project Name' } as any
    ]);
    (indicatorsServiceMock as any).indicators = undefined;
    
    component.body.set({ contract_id: '123', indicator_id: 1 });
    
    const html = (component as any).buildW1W2RestrictionHtml();
    expect(html).toContain('selected');
  });

  it('buildW1W2RestrictionHtml should handle when contract is found in list', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', select_label: 'Found Project' } as any,
      { agreement_id: '456', select_label: 'Other Project' } as any
    ]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([
      { indicators: [{ indicator_id: 1, name: 'Test Indicator' }] }
    ]);
    
    component.body.set({ contract_id: '123', indicator_id: 1 });
    
    const html = (component as any).buildW1W2RestrictionHtml();
    expect(html).toContain('Found Project');
    expect(html).toContain('Test Indicator');
  });

  it('buildW1W2RestrictionHtml should handle when contract is not found but agreementId exists', () => {
    contractsServiceMock.list.set([
      { agreement_id: '456', select_label: 'Other Project' } as any
    ]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([
      { indicators: [{ indicator_id: 1, name: 'Test Indicator' }] }
    ]);
    
    component.body.set({ contract_id: '123', indicator_id: 1 });
    
    const html = (component as any).buildW1W2RestrictionHtml();
    expect(html).toContain('123');
    expect(html).toContain('Test Indicator');
  });

  it('buildW1W2RestrictionHtml should handle when contract is not found and agreementId is null', () => {
    contractsServiceMock.list.set([
      { agreement_id: '456', select_label: 'Other Project' } as any
    ]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([
      { indicators: [{ indicator_id: 1, name: 'Test Indicator' }] }
    ]);
    
    component.body.set({ contract_id: null, indicator_id: 1 });
    
    const html = (component as any).buildW1W2RestrictionHtml();
    expect(html).toContain('selected');
  });

  it('buildW1W2RestrictionHtml should handle when contract.select_label is null', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', select_label: null } as any
    ]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([
      { indicators: [{ indicator_id: 1, name: 'Test Indicator' }] }
    ]);
    
    component.body.set({ contract_id: '123', indicator_id: 1 });
    
    const html = (component as any).buildW1W2RestrictionHtml();
    expect(html).toContain('123');
    expect(html).toContain('Test Indicator');
  });

  it('buildW1W2RestrictionHtml should handle when projectFirst is empty string', () => {
    contractsServiceMock.list.set([
      { agreement_id: '123', select_label: '' } as any
    ]);
    indicatorsServiceMock.indicators = jest.fn().mockReturnValue([
      { indicators: [{ indicator_id: 1, name: 'Test Indicator' }] }
    ]);
    
    component.body.set({ contract_id: '123', indicator_id: 1 });
    
    const html = (component as any).buildW1W2RestrictionHtml();
    expect(html).toContain('Test Indicator');
  });

  it('navigateToOicr should update oicrPrimaryOptionsDisabled with primary lever when lever exists', () => {
    component.body.set({ title: 'Test Title', contract_id: '123', year: 2024 });
    contractsServiceMock.list.set([
      { agreement_id: '123', lever_id: 999 } as any
    ]);
    
    const oicrUpdateSpy = (createResultManagementServiceMock.oicrPrimaryOptionsDisabled as any).update;
    oicrUpdateSpy.mockClear();
    
    component.navigateToOicr();
    
    expect(oicrUpdateSpy).toHaveBeenCalled();
    
    // Verify that the update callback includes the lever
    const updateCall = oicrUpdateSpy.mock.calls[0][0];
    const mockDisabled: any[] = [];
    const result = updateCall(mockDisabled);
    expect(result).toEqual([
      {
        result_lever_id: 0,
        result_id: 0,
        lever_id: 999,
        lever_role_id: 0,
        is_primary: true
      }
    ]);
  });

  it('navigateToOicr should call getPrimaryLeverId with empty string when contract_id is null in Number() call', () => {
    component.body.set({ title: 'Test', contract_id: null, year: 2024 });
    contractsServiceMock.list.set([
      { agreement_id: '', lever_id: 111 } as any
    ]);
    
    const getPrimaryLeverIdSpy = jest.spyOn(component, 'getPrimaryLeverId');
    component.navigateToOicr();
    
    // getPrimaryLeverId should be called with empty string when contract_id is null
    expect(getPrimaryLeverIdSpy).toHaveBeenCalledWith('');
    
    getPrimaryLeverIdSpy.mockRestore();
  });

  it('navigateToOicr should call getPrimaryLeverId with empty string when contract_id is undefined in Number() call', () => {
    component.body.set({ title: 'Test', contract_id: undefined, year: 2024 });
    contractsServiceMock.list.set([
      { agreement_id: '', lever_id: 111 } as any
    ]);
    
    const getPrimaryLeverIdSpy = jest.spyOn(component, 'getPrimaryLeverId');
    component.navigateToOicr();
    
    // getPrimaryLeverId should be called with empty string when contract_id is undefined
    expect(getPrimaryLeverIdSpy).toHaveBeenCalledWith('');
    
    getPrimaryLeverIdSpy.mockRestore();
  });
});
