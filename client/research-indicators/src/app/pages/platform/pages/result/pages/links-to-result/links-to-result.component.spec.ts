import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import LinksToResultComponent from './links-to-result.component';
import { CacheService } from '@shared/services/cache/cache.service';
import { SubmissionService } from '@shared/services/submission.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { ApiService } from '@shared/services/api.service';
import { ActionsService } from '@shared/services/actions.service';
import { ResultsCenterService } from '@pages/platform/pages/results-center/results-center.service';
import { Result } from '@shared/interfaces/result/result.interface';
import { mapOtherResultLinkPayloadToResult } from '@shared/utils/map-link-other-result-to-result';

jest.mock('@shared/constants/indicator-icon.constants', () => ({
  getIndicatorIcon: jest.fn().mockReturnValue({ icon: 'pi pi-star', color: '#000' })
}));

describe('LinksToResultComponent', () => {
  let component: LinksToResultComponent;
  let fixture: ComponentFixture<LinksToResultComponent>;
  let router: jest.Mocked<Router>;
  let cache: jest.Mocked<CacheService>;
  let apiService: jest.Mocked<ApiService>;
  let allModalsService: jest.Mocked<AllModalsService>;
  let actionsService: { showToast: jest.Mock };
  let submissionService: { isEditableStatus: jest.Mock };
  let resultsCenterService: jest.Mocked<ResultsCenterService>;

  beforeEach(async () => {
    router = {
      navigate: jest.fn().mockResolvedValue(true)
    } as unknown as jest.Mocked<Router>;

    cache = {
      currentResultId: signal('123'),
      getCurrentNumericResultId: jest.fn().mockReturnValue(123),
      showSectionHeaderActions: signal(false),
      currentMetadata: jest.fn().mockReturnValue({ result_title: 'Mock Result' }),
      hasSmallScreen: jest.fn().mockReturnValue(false),
      isSidebarCollapsed: jest.fn().mockReturnValue(false),
      headerHeight: signal(0),
      navbarHeight: signal(0)
    } as unknown as jest.Mocked<CacheService>;

    apiService = {
      GET_LinkedResults: jest.fn().mockResolvedValue({ data: { link_results: [] } }),
      GET_Results: jest.fn(),
      PATCH_LinkedResults: jest.fn().mockResolvedValue({ data: { link_results: [] } })
    } as unknown as jest.Mocked<ApiService>;

    allModalsService = {
      modalConfig: signal({
        createResult: { isOpen: false, title: 'Create a result' },
        submitResult: { isOpen: false, title: 'Submit Result' },
        requestPartner: { isOpen: false, title: 'Request Partner' },
        createOicrResult: { isOpen: false, title: 'Create OICR Result' },
        askForHelp: { isOpen: false, title: 'Ask For Help' },
        resultInformation: { isOpen: false, title: 'Result Information' },
        addContactPerson: { isOpen: false, title: 'Add Contact Person' },
        selectLinkedResults: {
          isOpen: false,
          title: 'Existing Results',
          isWide: true
        }
      }),
      openModal: jest.fn(),
      setRefreshLinkedResults: jest.fn(),
      syncSelectedResults: Object.assign(jest.fn().mockReturnValue([]) as any, { set: jest.fn() })
    } as unknown as jest.Mocked<AllModalsService>;

    actionsService = {
      showToast: jest.fn()
    };

    submissionService = {
      isEditableStatus: jest.fn().mockReturnValue(true)
    };

    resultsCenterService = {
      clearAllFiltersWithPreserve: jest.fn()
      // @ts-expect-error partial mock
    } as jest.Mocked<ResultsCenterService>;

    await TestBed.configureTestingModule({
      imports: [LinksToResultComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: CacheService, useValue: cache },
        { provide: HttpClient, useValue: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } },
        { provide: ApiService, useValue: apiService },
        { provide: AllModalsService, useValue: allModalsService },
        { provide: ActionsService, useValue: actionsService },
        { provide: SubmissionService, useValue: submissionService },
        { provide: ResultsCenterService, useValue: resultsCenterService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: jest.fn().mockReturnValue('1.0')
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LinksToResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate back to geographic scope', async () => {
    router.navigate.mockClear();
    await component.navigate('back');
    expect(router.navigate).toHaveBeenCalledWith(['result', '123', 'geographic-scope'], { queryParams: { version: '1.0' }, replaceUrl: true });
  });

  it('should navigate next to evidence', async () => {
    router.navigate.mockClear();
    await component.navigate('next');
    expect(apiService.PATCH_LinkedResults).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['result', '123', 'evidence'], { queryParams: { version: '1.0' }, replaceUrl: true });
  });

  it('should not navigate when page is undefined', async () => {
    router.navigate.mockClear();
    await component.navigate();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should navigate without version query param when version is null', async () => {
    const route = TestBed.inject(ActivatedRoute) as ActivatedRoute;
    // @ts-expect-error override mock
    (route.snapshot.queryParamMap.get as jest.Mock).mockReturnValueOnce(null);

    router.navigate.mockClear();
    await component.navigate('back');

    expect(router.navigate).toHaveBeenCalledWith(['result', '123', 'geographic-scope'], {
      queryParams: undefined,
      replaceUrl: true
    });
  });

  it('should format result code with padding', () => {
    expect(component.formatResultCode(1)).toBe('001');
    expect(component.formatResultCode('23')).toBe('023');
    expect(component.formatResultCode('')).toBe('');
  });

  it('should delegate getIndicatorIcon to indicator icon helper', () => {
    const { getIndicatorIcon } = jest.requireMock('@shared/constants/indicator-icon.constants') as {
      getIndicatorIcon: jest.Mock;
    };

    const result = { indicators: { icon_src: 'icon.png' }, indicator_id: 5 } as unknown as Result;
    const icon = component.getIndicatorIcon(result);

    expect(getIndicatorIcon).toHaveBeenCalledWith('icon.png', 5);
    expect(icon).toEqual({ icon: 'pi pi-star', color: '#000' });
  });

  it('should remove linked result when editable and sync selection', () => {
    submissionService.isEditableStatus.mockReturnValue(true);
    const current = [
      { result_id: 1 } as unknown as Result,
      { result_id: 2 } as unknown as Result
    ];
    component.linkedResults.set(current);

    component.removeLinkedResult(1);

    expect(component.linkedResults()).toEqual([{ result_id: 2 } as unknown as Result]);
    expect(allModalsService.syncSelectedResults.set).toHaveBeenCalledWith([{ result_id: 2 }]);
  });

  it('should not remove linked result when not editable', () => {
    submissionService.isEditableStatus.mockReturnValue(false);
    const current = [{ result_id: 1 } as unknown as Result];
    component.linkedResults.set(current);
    allModalsService.syncSelectedResults.set.mockClear();

    component.removeLinkedResult(1);

    expect(component.linkedResults()).toEqual(current);
    expect(allModalsService.syncSelectedResults.set).not.toHaveBeenCalled();
  });

  it('should open search linked results modal and clear filters', () => {
    component.openSearchLinkedResults();
    expect(resultsCenterService.clearAllFiltersWithPreserve).toHaveBeenCalledWith([1, 2, 3, 4, 6]);
    expect(allModalsService.openModal).toHaveBeenCalledWith('selectLinkedResults');
  });

  it('should load linked results when modal closes', async () => {
    const loadSpy = jest.spyOn(component, 'loadLinkedResults').mockResolvedValue();
    // Obtener callback que el constructor registró en setRefreshLinkedResults
    const callback = (allModalsService.setRefreshLinkedResults as jest.Mock).mock.calls[0][0] as () => Promise<void>;

    await callback();

    expect(loadSpy).toHaveBeenCalled();
  });

  it('should call loadLinkedResults when selectLinkedResults modal closes (effect)', () => {
    const loadSpy = jest.spyOn(component, 'loadLinkedResults').mockResolvedValue();
    const modalConfigSignal = allModalsService.modalConfig as { set: (v: unknown) => void; update: (fn: (v: unknown) => unknown) => void };
    const base = allModalsService.modalConfig();
    modalConfigSignal.update((c: any) => ({ ...c, selectLinkedResults: { ...c.selectLinkedResults, isOpen: true } }));
    fixture.detectChanges();
    modalConfigSignal.update((c: any) => ({ ...c, selectLinkedResults: { ...c.selectLinkedResults, isOpen: false } }));
    fixture.detectChanges();
    expect(loadSpy).toHaveBeenCalled();
  });

  it('should set linkedResults to empty and loading false when GET_LinkedResults returns no links', async () => {
    apiService.GET_LinkedResults.mockResolvedValue({ data: { link_results: [] } });
    await component.loadLinkedResults();
    expect(component.linkedResults()).toEqual([]);
    expect(component.loading()).toBe(false);
  });

  it('should handle loadLinkedResults error and set empty arrays', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    apiService.GET_LinkedResults.mockRejectedValue(new Error('Network error'));
    await component.loadLinkedResults();
    expect(component.linkedResults()).toEqual([]);
    expect(component.originalLinkedResults()).toEqual([]);
    expect(component.loading()).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Error loading linked results', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('should handle loadLinkedResults with empty linkedResultIds', async () => {
    apiService.GET_LinkedResults.mockResolvedValueOnce({ data: { link_results: [] } } as any);
    apiService.GET_Results.mockClear();

    await component.loadLinkedResults();

    expect(component.linkedResults()).toEqual([]);
    expect(apiService.GET_Results).not.toHaveBeenCalled();
    expect(component.loading()).toBe(false);
  });

  it('should use empty array when response has no data or link_results (line 67 fallback)', async () => {
    apiService.GET_LinkedResults.mockResolvedValueOnce({ data: undefined } as any);
    await component.loadLinkedResults();
    expect(component.linkedResults()).toEqual([]);
    expect(apiService.GET_Results).not.toHaveBeenCalled();

    apiService.GET_LinkedResults.mockResolvedValueOnce({ data: {} } as any);
    await component.loadLinkedResults();
    expect(component.linkedResults()).toEqual([]);
  });

  it('should map nothing when link rows have no embedded other_result', async () => {
    apiService.GET_LinkedResults.mockResolvedValueOnce({
      data: { link_results: [{ other_result_id: 1 }] }
    } as any);
    apiService.GET_Results.mockClear();

    await component.loadLinkedResults();

    expect(apiService.GET_Results).not.toHaveBeenCalled();
    expect(component.linkedResults()).toEqual([]);
  });

  it('should load and map linked results from embedded other_result (no GET_Results)', async () => {
    const o1 = {
      result_id: 1,
      result_official_code: 1,
      title: 'R1',
      platform_code: 'STAR',
      indicator_id: 1
    };
    const o2 = {
      result_id: 2,
      result_official_code: 2,
      title: 'R2',
      platform_code: 'STAR',
      indicator_id: 2
    };
    const expected: Result[] = [mapOtherResultLinkPayloadToResult(o1), mapOtherResultLinkPayloadToResult(o2)];

    apiService.GET_LinkedResults.mockResolvedValueOnce({
      data: {
        link_results: [
          { other_result_id: 1, other_result: o1 },
          { other_result_id: 2, other_result: o2 }
        ]
      }
    } as any);
    apiService.GET_Results.mockClear();

    await component.loadLinkedResults();

    expect(apiService.GET_LinkedResults).toHaveBeenCalledWith(123);
    expect(apiService.GET_Results).not.toHaveBeenCalled();
    expect(component.linkedResults()).toEqual(expected);
    expect(component.originalLinkedResults()).toEqual(expected);
    expect(allModalsService.syncSelectedResults.set).toHaveBeenCalledWith(expected);
    expect(component.loading()).toBe(false);
  });

  it('should handle error when loading linked results', async () => {
    console.error = jest.fn();
    apiService.GET_LinkedResults.mockRejectedValueOnce(new Error('fail'));

    await component.loadLinkedResults();

    expect(component.linkedResults()).toEqual([]);
    expect(component.originalLinkedResults()).toEqual([]);
    expect(component.loading()).toBe(false);
  });

  it('should not save data when not editable', async () => {
    submissionService.isEditableStatus.mockReturnValue(false);
    apiService.PATCH_LinkedResults.mockClear();

    await component.saveData();

    expect(apiService.PATCH_LinkedResults).not.toHaveBeenCalled();
  });

  it('should save data successfully and reload', async () => {
    submissionService.isEditableStatus.mockReturnValue(true);
    const currentResults: Result[] = [
      { result_id: 1 } as any,
      { result_id: 2 } as any
    ];
    component.linkedResults.set(currentResults);
    const loadSpy = jest.spyOn(component, 'loadLinkedResults').mockResolvedValue();

    await component.saveData();

    expect(apiService.PATCH_LinkedResults).toHaveBeenCalledWith(123, {
      link_results: [{ other_result_id: 1 }, { other_result_id: 2 }]
    });
    expect(actionsService.showToast).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'Linked results',
      detail: 'Data saved successfully'
    });
    expect(component.originalLinkedResults()).toEqual(currentResults);
    expect(loadSpy).toHaveBeenCalled();
    expect(component.saving()).toBe(false);
  });

  it('should handle error when saving data and restore original list', async () => {
    submissionService.isEditableStatus.mockReturnValue(true);
    const original: Result[] = [{ result_id: 1 } as any];
    const modified: Result[] = [{ result_id: 2 } as any];
    component.originalLinkedResults.set(original);
    component.linkedResults.set(modified);
    apiService.PATCH_LinkedResults.mockRejectedValueOnce(new Error('fail'));

    await component.saveData();

    expect(actionsService.showToast).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Linked results',
      detail: 'Unable to save changes, please try again'
    });
    expect(component.linkedResults()).toEqual(original);
    expect(component.saving()).toBe(false);
  });
});

