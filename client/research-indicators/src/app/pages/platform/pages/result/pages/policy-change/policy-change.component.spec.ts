import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { Component, EventEmitter, Input, NO_ERRORS_SCHEMA, Output, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Select } from 'primeng/select';
import { Tooltip } from 'primeng/tooltip';

import PolicyChangeComponent from './policy-change.component';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '@shared/services/api.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { ActionsService } from '@shared/services/actions.service';
import { SubmissionService } from '@shared/services/submission.service';
import { VersionWatcherService } from '@shared/services/version-watcher.service';
import { SelectComponent } from '@shared/components/custom-fields/select/select.component';
import { GetPolicyChangeLinkableResultsService } from '@shared/services/control-list/get-policy-change-linkable-results.service';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import { formatInnovationDevCode, formatInnovationDevLabel } from '../innovation-use-details/innovation-use-details.component';
import { mapV2ResultListItemToResult } from '@shared/interfaces/result/map-v2-result-list-item';
import { CustomTagComponent } from '@shared/components/custom-tag/custom-tag.component';

describe('PolicyChangeComponent', () => {
  let component: PolicyChangeComponent;
  let fixture: ComponentFixture<PolicyChangeComponent>;
  let mockApiService: any;
  let mockCacheService: any;
  let mockActionsService: any;
  let mockSubmissionService: any;
  let mockVersionWatcherService: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockApiService = {
      GET_PolicyChange: jest.fn(),
      PATCH_PolicyChange: jest.fn()
    };

    mockCacheService = {
      getCurrentNumericResultId: jest.fn().mockReturnValue(123),
      currentResultId: jest.fn().mockReturnValue('STAR-123')
    };

    mockActionsService = {
      showToast: jest.fn()
    };

    mockSubmissionService = {
      isEditableStatus: jest.fn().mockReturnValue(true)
    };

    mockVersionWatcherService = {
      onVersionChange: jest.fn()
    };

    mockRouter = {
      navigate: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PolicyChangeComponent, HttpClientTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: ActionsService, useValue: mockActionsService },
        { provide: SubmissionService, useValue: mockSubmissionService },
        { provide: VersionWatcherService, useValue: mockVersionWatcherService },
        { provide: Router, useValue: mockRouter },
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

    fixture = TestBed.createComponent(PolicyChangeComponent);
    component = fixture.componentInstance;
    // Don't call detectChanges to avoid template rendering issues
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.loading()).toBe(false);
    expect(component.body()).toEqual({});
    expect(component.policyStages().list).toHaveLength(3);
    expect(component.policyStages().loading).toBe(false);
  });

  it('should register version change callback in constructor', () => {
    expect(mockVersionWatcherService.onVersionChange).toHaveBeenCalled();
  });

  it('canRemove should return submission service result', () => {
    mockSubmissionService.isEditableStatus.mockReturnValue(true);
    expect(component.canRemove()).toBe(true);

    mockSubmissionService.isEditableStatus.mockReturnValue(false);
    expect(component.canRemove()).toBe(false);
  });

  it('should call getData when versionWatcher triggers version change', async () => {
    const spy = jest.spyOn(component, 'getData').mockResolvedValue();
    expect(mockVersionWatcherService.onVersionChange).toHaveBeenCalled();
    const cb = (mockVersionWatcherService.onVersionChange as jest.Mock).mock.calls[0][0];
    await cb();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should load data successfully', async () => {
    const mockData = { id: 1, name: 'Test Policy' };
    mockApiService.GET_PolicyChange.mockResolvedValue({ data: mockData });

    await component.getData();

    expect(mockApiService.GET_PolicyChange).toHaveBeenCalledWith(123);
    expect(component.loading()).toBe(false);
    expect(component.body()).toEqual({ ...mockData, loaded: true });
  });

  it('should handle getData error', async () => {
    const error = new Error('API Error');
    mockApiService.GET_PolicyChange.mockRejectedValue(error);

    await expect(component.getData()).rejects.toThrow('API Error');
    // Loading should remain true since the error is not caught in getData
    expect(component.loading()).toBe(true);
  });

  it('should save data when submission is editable', async () => {
    const mockBody = { id: 1, name: 'Test Policy' };
    component.body.set(mockBody);
    mockApiService.PATCH_PolicyChange.mockResolvedValue({ successfulRequest: true });
    mockApiService.GET_PolicyChange.mockResolvedValue({ data: mockBody });

    await component.saveData();

    expect(mockApiService.PATCH_PolicyChange).toHaveBeenCalledWith(123, mockBody);
    expect(mockActionsService.showToast).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'Policy Change',
      detail: 'Data saved successfully'
    });
    expect(mockApiService.GET_PolicyChange).toHaveBeenCalledWith(123);
  });

  it('should not save data when submission is not editable', async () => {
    mockSubmissionService.isEditableStatus.mockReturnValue(false);

    await component.saveData();

    expect(mockApiService.PATCH_PolicyChange).not.toHaveBeenCalled();
    expect(mockActionsService.showToast).not.toHaveBeenCalled();
  });

  it('should handle save data when API returns unsuccessful response', async () => {
    const mockBody = { id: 1, name: 'Test Policy' };
    component.body.set(mockBody);
    mockApiService.PATCH_PolicyChange.mockResolvedValue({ successfulRequest: false });

    await component.saveData();

    expect(mockApiService.PATCH_PolicyChange).toHaveBeenCalledWith(123, mockBody);
    expect(mockActionsService.showToast).not.toHaveBeenCalled();
    expect(mockApiService.GET_PolicyChange).not.toHaveBeenCalled();
  });

  it('should navigate to partners when page is next', async () => {
    mockApiService.PATCH_PolicyChange.mockResolvedValue({ successfulRequest: true });
    mockApiService.GET_PolicyChange.mockResolvedValue({ data: {} });
    
    await component.saveData('next');

    expect(mockRouter.navigate).toHaveBeenCalledWith(['result', 'STAR-123', 'partners'], {
      queryParams: { version: '1.0' },
      replaceUrl: true
    });
  });

  it('should navigate to alliance-alignment when page is back', async () => {
    mockApiService.PATCH_PolicyChange.mockResolvedValue({ successfulRequest: true });
    mockApiService.GET_PolicyChange.mockResolvedValue({ data: {} });
    
    await component.saveData('back');

    expect(mockRouter.navigate).toHaveBeenCalledWith(['result', 'STAR-123', 'alliance-alignment'], {
      queryParams: { version: '1.0' },
      replaceUrl: true
    });
  });

  it('should not navigate when page is undefined', async () => {
    mockApiService.PATCH_PolicyChange.mockResolvedValue({ successfulRequest: true });
    mockApiService.GET_PolicyChange.mockResolvedValue({ data: {} });
    
    await component.saveData();

    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should navigate without query params when version is null', async () => {
    const route = TestBed.inject(ActivatedRoute) as any;
    route.snapshot.queryParamMap.get = jest.fn().mockReturnValue(null);
    mockApiService.PATCH_PolicyChange.mockResolvedValue({ successfulRequest: true });
    mockApiService.GET_PolicyChange.mockResolvedValue({ data: {} });

    await component.saveData('next');

    expect(mockRouter.navigate).toHaveBeenCalledWith(['result', 'STAR-123', 'partners'], {
      queryParams: undefined,
      replaceUrl: true
    });
  });

  it('should navigate without query params when version is undefined', async () => {
    const route = TestBed.inject(ActivatedRoute) as any;
    route.snapshot.queryParamMap.get = jest.fn().mockReturnValue(undefined);
    mockApiService.PATCH_PolicyChange.mockResolvedValue({ successfulRequest: true });
    mockApiService.GET_PolicyChange.mockResolvedValue({ data: {} });

    await component.saveData('next');

    expect(mockRouter.navigate).toHaveBeenCalledWith(['result', 'STAR-123', 'partners'], {
      queryParams: undefined,
      replaceUrl: true
    });
  });

  it('should set loading to true and then false during saveData', async () => {
    const setLoadingSpy = jest.spyOn(component.loading, 'set');
    mockSubmissionService.isEditableStatus.mockReturnValue(false);

    await component.saveData();

    expect(setLoadingSpy).toHaveBeenCalledWith(true);
    expect(setLoadingSpy).toHaveBeenCalledWith(false);
  });

  it('shows USD Amount and Status fields only for Program/Budget/Investment (type 3)', () => {
    component.body.set({ policy_type_id: 1 } as any);
    expect(component.isProgramBudgetOrInvestment()).toBe(false);

    component.body.set({ policy_type_id: 3 } as any);
    expect(component.isProgramBudgetOrInvestment()).toBe(true);
  });

  it('clears amount fields when policy type changes away from type 3', () => {
    component.body.set({
      policy_type_id: 3,
      usd_amount: 100,
      amount_status: 'Confirmed'
    } as any);

    component.onPolicyTypeChange(1);

    expect(component.body().usd_amount).toBeNull();
    expect(component.body().amount_status).toBeNull();
  });

  it('initializes a missing USD amount to zero for Program/Budget/Investment', async () => {
    mockApiService.GET_PolicyChange.mockResolvedValue({
      data: { policy_type_id: 3, usd_amount: null, amount_status: null }
    });

    await component.getData();

    expect(component.body().usd_amount).toBe(0);
  });

  it('keeps a saved zero amount', async () => {
    mockApiService.GET_PolicyChange.mockResolvedValue({
      data: { policy_type_id: 3, usd_amount: 0, amount_status: 'Confirmed' }
    });

    await component.getData();

    expect(component.body().usd_amount).toBe(0);
  });

  it('saves type 3 without a warning when status is still empty', async () => {
    component.body.set({ policy_type_id: 3, usd_amount: 0 } as any);
    mockApiService.PATCH_PolicyChange.mockResolvedValue({ successfulRequest: true });
    mockApiService.GET_PolicyChange.mockResolvedValue({ data: { policy_type_id: 3, usd_amount: 0 } });

    await component.saveData();

    expect(mockApiService.PATCH_PolicyChange).toHaveBeenCalled();
    expect(mockActionsService.showToast).not.toHaveBeenCalledWith(expect.objectContaining({ severity: 'warning' }));
  });

  it('should test navigateTo function directly', async () => {
    // Test the navigateTo function by calling saveData with different page values
    mockApiService.PATCH_PolicyChange.mockResolvedValue({ successfulRequest: true });
    mockApiService.GET_PolicyChange.mockResolvedValue({ data: {} });

    // Test 'next' navigation
    await component.saveData('next');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['result', 'STAR-123', 'partners'], {
      queryParams: { version: '1.0' },
      replaceUrl: true
    });

    // Reset mock
    mockRouter.navigate.mockClear();

    // Test 'back' navigation
    await component.saveData('back');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['result', 'STAR-123', 'alliance-alignment'], {
      queryParams: { version: '1.0' },
      replaceUrl: true
    });
  });
});

@Component({ selector: 'app-form-header', template: '', standalone: true })
class FormHeaderStub {}

@Component({ selector: 'app-radio-button', template: '', standalone: true })
class RadioButtonStub {
  @Input() isRequired: unknown;
  @Input() label = '';
  @Input() signal: unknown;
  @Input() disabled: unknown;
  @Input() serviceName: unknown;
  @Input() optionLabel: unknown;
  @Input() optionValue: unknown;
  @Input() direction: unknown;
  @Input() spaceX: unknown;
  @Output() selectEvent = new EventEmitter<unknown>();
}

@Component({ selector: 'app-textarea', template: '', standalone: true })
class TextareaStub {
  @Input() label = '';
  @Input() isRequired: unknown;
  @Input() description: unknown;
  @Input() disabled: unknown;
  @Input() signal: unknown;
  @Input() optionValue: unknown;
  @Input() placeholder: unknown;
  @Input() maxLength: unknown;
}

@Component({ selector: 'app-multiselect', template: '', standalone: true })
class MultiselectStub {
  @Input() label = '';
  @Input() isRequired: unknown;
  @Input() signal: unknown;
  @Input() optionLabel: unknown;
  @Input() optionValue: unknown;
  @Input() disabled: unknown;
  @Input() removeCondition: unknown;
  @Input() signalOptionValue: unknown;
  @Input() serviceName: unknown;
  @Input() placeholder: unknown;
}

@Component({ selector: 'app-input', template: '', standalone: true })
class InputStub {
  @Input() type: unknown;
  @Input() min: unknown;
  @Input() requiredMode: unknown;
  @Input() label = '';
  @Input() placeholder: unknown;
  @Input() disabled: unknown;
  @Input() signal: unknown;
  @Input() optionValue: unknown;
}

@Component({ selector: 'app-navigation-buttons', template: '', standalone: true })
class NavigationButtonsStub {
  @Output() back = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
}

@Component({ selector: 'app-partner-selected-item', template: '', standalone: true })
class PartnerSelectedItemStub {
  @Input() institution: unknown;
}

const INNOVATION_DEVELOPMENT_LABEL = 'Link to a reported Innovation Development output';
const INNOVATION_USE_LABEL = 'Link to a reported Innovation Use';
const EMPTY_DEVELOPMENT_TOOLTIP = 'There are no reported Innovation Development outputs to link.';
const EMPTY_USE_TOOLTIP = 'There are no reported Innovation Use results to link.';
const DEVELOPMENT_LOAD_ERROR = 'The Innovation Development outputs could not be loaded. Please try again.';
const USE_LOAD_ERROR = 'The Innovation Use results could not be loaded. Please try again.';

type ListOutcome = 'loading' | 'error' | 'empty' | 'options';

describe('PolicyChangeComponent innovation link pickers (R-PCIL-001…004, §5.1)', () => {
  let fixture: ComponentFixture<PolicyChangeComponent>;
  let component: PolicyChangeComponent;
  let mockApiService: { GET_Results: jest.Mock; GET_PolicyChange: jest.Mock; PATCH_PolicyChange: jest.Mock };
  let mockSubmissionService: { isEditableStatus: jest.Mock };
  let linkableResults: GetPolicyChangeLinkableResultsService;
  let gates: Map<number, { promise: Promise<unknown>; resolve: (value: unknown) => void }>;

  function row(indicatorId: number) {
    return mapV2ResultListItemToResult({
      result_id: indicatorId === 2 ? 42 : 66,
      result_official_code: indicatorId === 2 ? '284' : '601',
      title: indicatorId === 2 ? 'Rice bean model' : 'Use of rice bean',
      platform_code: 'STAR',
      indicator_id: indicatorId,
      status_id: 1,
      status_name: indicatorId === 2 ? 'Editing' : 'Submitted'
    });
  }

  function payload(outcome: ListOutcome, indicatorId: number) {
    if (outcome === 'error') return { successfulRequest: false };
    if (outcome === 'empty') return { successfulRequest: true, data: { results: [] } };
    return { successfulRequest: true, data: { results: [row(indicatorId)] } };
  }

  function pickerHost(label: string): HTMLElement {
    const hosts = Array.from(fixture.nativeElement.querySelectorAll('app-select')) as HTMLElement[];
    const host = hosts.find(el => (el.textContent ?? '').includes(label));
    if (!host) throw new Error(`app-select not found for "${label}"`);
    return host;
  }

  function renderedSelect(label: string): HTMLElement {
    const select = pickerHost(label).querySelector('p-select');
    if (!select) throw new Error(`p-select not found for "${label}"`);
    return select as HTMLElement;
  }

  function isRenderedDisabled(label: string): boolean {
    const combobox = renderedSelect(label).querySelector('[role="combobox"]');
    if (!combobox) throw new Error(`combobox not found for "${label}"`);
    return combobox.getAttribute('aria-disabled') === 'true';
  }

  function tooltipContent(label: string): string {
    const debug = fixture.debugElement.queryAll(By.css('app-select')).find(de => (de.nativeElement.textContent ?? '').includes(label));
    if (!debug) throw new Error(`app-select debug element not found for "${label}"`);
    return String(debug.injector.get(Tooltip).content ?? '');
  }

  function selectInstance(label: string): SelectComponent {
    const debug = fixture.debugElement.queryAll(By.css('app-select')).find(de => (de.nativeElement.textContent ?? '').includes(label));
    if (!debug) throw new Error(`app-select debug element not found for "${label}"`);
    return debug.componentInstance as SelectComponent;
  }

  function primeSelect(label: string): Select {
    const debug = fixture.debugElement.queryAll(By.css('app-select')).find(de => (de.nativeElement.textContent ?? '').includes(label));
    if (!debug) throw new Error(`app-select debug element not found for "${label}"`);
    const prime = debug.query(By.directive(Select));
    if (!prime) throw new Error(`p-select not rendered for "${label}"`);
    return prime.componentInstance as Select;
  }

  async function arrange(options: {
    editable: boolean;
    development: ListOutcome;
    use: ListOutcome;
    savedDevelopmentId?: number;
    savedUseId?: number;
  }): Promise<void> {
    mockSubmissionService.isEditableStatus.mockReturnValue(options.editable);
    component.body.set({
      innovation_development: options.savedDevelopmentId,
      innovation_use: options.savedUseId
    });
    fixture.detectChanges();
    fixture.detectChanges();
    if (options.development === 'loading' || options.use === 'loading') return;
    gates.get(2)?.resolve(payload(options.development, 2));
    gates.get(6)?.resolve(payload(options.use, 6));
    await fixture.whenStable();
    fixture.detectChanges();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    gates = new Map();
    mockApiService = {
      GET_PolicyChange: jest.fn(),
      PATCH_PolicyChange: jest.fn(),
      GET_Results: jest.fn((params: { 'indicator-codes': number[] }) => {
        const indicatorId = params['indicator-codes'][0];
        let gate = gates.get(indicatorId);
        if (!gate) {
          let resolve!: (value: unknown) => void;
          const promise = new Promise<unknown>(res => {
            resolve = res;
          });
          gate = { promise, resolve };
          gates.set(indicatorId, gate);
        }
        return gate.promise;
      })
    };
    mockSubmissionService = { isEditableStatus: jest.fn().mockReturnValue(true) };

    await TestBed.configureTestingModule({
      imports: [PolicyChangeComponent, HttpClientTestingModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        {
          provide: CacheService,
          useValue: {
            getCurrentNumericResultId: jest.fn().mockReturnValue(123),
            currentResultId: jest.fn().mockReturnValue('STAR-123'),
            currentResultIsLoading: signal(false)
          }
        },
        { provide: ActionsService, useValue: { showToast: jest.fn() } },
        { provide: SubmissionService, useValue: mockSubmissionService },
        { provide: VersionWatcherService, useValue: { onVersionChange: jest.fn() } },
        { provide: Router, useValue: { navigate: jest.fn() } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: jest.fn().mockReturnValue('1.0') } } }
        }
      ]
    });
    TestBed.overrideComponent(PolicyChangeComponent, {
      set: {
        imports: [
          FormHeaderStub,
          RadioButtonStub,
          TextareaStub,
          MultiselectStub,
          SelectComponent,
          CustomTagComponent,
          InputStub,
          NavigationButtonsStub,
          FormsModule,
          TooltipModule,
          PartnerSelectedItemStub
        ]
      }
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(PolicyChangeComponent);
    component = fixture.componentInstance;
    linkableResults = TestBed.inject(GetPolicyChangeLinkableResultsService);
  });

  it('requests indicator 2 for Innovation Development and indicator 6 for Innovation Use', async () => {
    await arrange({ editable: true, development: 'options', use: 'options' });

    const requested = mockApiService.GET_Results.mock.calls.map(call => call[0]['indicator-codes'][0]);
    expect(requested).toContain(2);
    expect(requested).toContain(6);
    expect(new Set(requested)).toEqual(new Set([2, 6]));
    expect(selectInstance(INNOVATION_DEVELOPMENT_LABEL).serviceParams).toBe(2);
    expect(selectInstance(INNOVATION_USE_LABEL).serviceParams).toBe(6);
    expect(selectInstance(INNOVATION_DEVELOPMENT_LABEL).optionValue.body).toBe('innovation_development');
    expect(selectInstance(INNOVATION_USE_LABEL).optionValue.body).toBe('innovation_use');
  });

  it('§5.1 loading — Innovation Development picker is disabled with no message', async () => {
    await arrange({ editable: true, development: 'loading', use: 'options' });

    expect(linkableResults.getLoading(2)()).toBe(true);
    expect(isRenderedDisabled(INNOVATION_DEVELOPMENT_LABEL)).toBe(true);
    expect(tooltipContent(INNOVATION_DEVELOPMENT_LABEL)).toBe('');
    expect(pickerHost(INNOVATION_DEVELOPMENT_LABEL).parentElement?.textContent).not.toContain(DEVELOPMENT_LOAD_ERROR);
  });

  it('§5.1 loading — Innovation Use picker is disabled with no message', async () => {
    await arrange({ editable: true, development: 'options', use: 'loading' });

    expect(linkableResults.getLoading(6)()).toBe(true);
    expect(isRenderedDisabled(INNOVATION_USE_LABEL)).toBe(true);
    expect(tooltipContent(INNOVATION_USE_LABEL)).toBe('');
    expect(pickerHost(INNOVATION_USE_LABEL).parentElement?.textContent).not.toContain(USE_LOAD_ERROR);
  });

  it('§5.1 error — Innovation Development picker is disabled and shows the inline error', async () => {
    await arrange({ editable: true, development: 'error', use: 'options' });

    expect(isRenderedDisabled(INNOVATION_DEVELOPMENT_LABEL)).toBe(true);
    expect(pickerHost(INNOVATION_DEVELOPMENT_LABEL).parentElement?.textContent).toContain(DEVELOPMENT_LOAD_ERROR);
    expect(tooltipContent(INNOVATION_DEVELOPMENT_LABEL)).toBe('');
    const errorText = pickerHost(INNOVATION_DEVELOPMENT_LABEL).parentElement?.querySelector('span.fs-\\[14\\]');
    expect(errorText?.className).toContain('text-[var(--ac-grey-800)]');
    expect(errorText?.parentElement?.querySelector('i')?.className).toContain('text-[var(--ac-red-1)]');
  });

  it('§5.1 error — Innovation Use picker is disabled and shows the inline error', async () => {
    await arrange({ editable: true, development: 'options', use: 'error' });

    expect(isRenderedDisabled(INNOVATION_USE_LABEL)).toBe(true);
    expect(pickerHost(INNOVATION_USE_LABEL).parentElement?.textContent).toContain(USE_LOAD_ERROR);
    expect(tooltipContent(INNOVATION_USE_LABEL)).toBe('');
  });

  it('Innovation Use error leaves the Innovation Development picker enabled', async () => {
    await arrange({ editable: true, development: 'options', use: 'error' });

    expect(isRenderedDisabled(INNOVATION_USE_LABEL)).toBe(true);
    expect(isRenderedDisabled(INNOVATION_DEVELOPMENT_LABEL)).toBe(false);
    expect(pickerHost(INNOVATION_DEVELOPMENT_LABEL).parentElement?.textContent).not.toContain(DEVELOPMENT_LOAD_ERROR);
  });

  it('§5.1 empty — Innovation Development picker is disabled with the empty-state tooltip', async () => {
    await arrange({ editable: true, development: 'empty', use: 'options' });

    expect(isRenderedDisabled(INNOVATION_DEVELOPMENT_LABEL)).toBe(true);
    expect(tooltipContent(INNOVATION_DEVELOPMENT_LABEL)).toBe(EMPTY_DEVELOPMENT_TOOLTIP);
    expect(pickerHost(INNOVATION_DEVELOPMENT_LABEL).parentElement?.textContent).not.toContain(DEVELOPMENT_LOAD_ERROR);
  });

  it('§5.1 empty — Innovation Use picker is disabled with the empty-state tooltip', async () => {
    await arrange({ editable: true, development: 'options', use: 'empty' });

    expect(isRenderedDisabled(INNOVATION_USE_LABEL)).toBe(true);
    expect(tooltipContent(INNOVATION_USE_LABEL)).toBe(EMPTY_USE_TOOLTIP);
    expect(pickerHost(INNOVATION_USE_LABEL).parentElement?.textContent).not.toContain(USE_LOAD_ERROR);
  });

  it('§5.1 enabled — Innovation Development picker is enabled when editable and the list has options', async () => {
    await arrange({ editable: true, development: 'options', use: 'options' });

    expect(isRenderedDisabled(INNOVATION_DEVELOPMENT_LABEL)).toBe(false);
    expect(renderedSelect(INNOVATION_DEVELOPMENT_LABEL).classList.contains('p-disabled')).toBe(false);
    expect(tooltipContent(INNOVATION_DEVELOPMENT_LABEL)).toBe('');
    expect(renderedSelect(INNOVATION_DEVELOPMENT_LABEL).textContent).not.toContain(DEVELOPMENT_LOAD_ERROR);
  });

  it('§5.1 enabled — Innovation Use picker is enabled when editable and the list has options', async () => {
    await arrange({ editable: true, development: 'options', use: 'options' });

    expect(isRenderedDisabled(INNOVATION_USE_LABEL)).toBe(false);
    expect(renderedSelect(INNOVATION_USE_LABEL).classList.contains('p-disabled')).toBe(false);
    expect(tooltipContent(INNOVATION_USE_LABEL)).toBe('');
  });

  it('§5.1 read-only — Innovation Development picker stays disabled and still shows the saved value', async () => {
    const saved = row(2);
    await arrange({
      editable: false,
      development: 'options',
      use: 'options',
      savedDevelopmentId: saved.result_id
    });

    expect(isRenderedDisabled(INNOVATION_DEVELOPMENT_LABEL)).toBe(true);
    expect(renderedSelect(INNOVATION_DEVELOPMENT_LABEL).classList.contains('p-disabled')).toBe(true);
    expect(tooltipContent(INNOVATION_DEVELOPMENT_LABEL)).toBe('');
    expect(renderedSelect(INNOVATION_DEVELOPMENT_LABEL).textContent).toContain(formatInnovationDevLabel(saved));
  });

  it('§5.1 read-only — Innovation Use picker stays disabled and still shows the saved value', async () => {
    const saved = row(6);
    await arrange({
      editable: false,
      development: 'options',
      use: 'options',
      savedUseId: saved.result_id
    });

    expect(isRenderedDisabled(INNOVATION_USE_LABEL)).toBe(true);
    expect(renderedSelect(INNOVATION_USE_LABEL).classList.contains('p-disabled')).toBe(true);
    expect(renderedSelect(INNOVATION_USE_LABEL).textContent).toContain(formatInnovationDevLabel(saved));
  });

  it('binds a picked result onto innovation_development and innovation_use (R-PCIL-004)', async () => {
    await arrange({ editable: true, development: 'options', use: 'options' });

    selectInstance(INNOVATION_DEVELOPMENT_LABEL).setValue(row(2).result_id);
    selectInstance(INNOVATION_USE_LABEL).setValue(row(6).result_id);
    fixture.detectChanges();

    expect(component.body().innovation_development).toBe(42);
    expect(component.body().innovation_use).toBe(66);
    const devFilter = fixture.debugElement
      .queryAll(By.css('app-select'))
      .find(de => (de.nativeElement.textContent ?? '').includes(INNOVATION_DEVELOPMENT_LABEL))
      ?.query(By.css('p-select'));
    expect(devFilter?.componentInstance.filterBy).toBe('result_official_code,title,platform_code');
  });

  it('open-list option rows render the code in bold and the status tag', async () => {
    await arrange({ editable: true, development: 'options', use: 'options' });

    for (const [label, indicatorId] of [
      [INNOVATION_DEVELOPMENT_LABEL, 2],
      [INNOVATION_USE_LABEL, 6]
    ] as const) {
      const option = linkableResults.getList(indicatorId)()[0];
      if (!option) throw new Error('expected a linkable result');
      const select = selectInstance(label);
      const view = select.itemTemplate!.createEmbeddedView({ $implicit: option });
      view.detectChanges();
      const host = document.createElement('div');
      view.rootNodes.forEach(node => host.appendChild(node));

      const bold = host.querySelector('.font-bold');
      expect(bold?.textContent?.trim()).toBe(formatInnovationDevCode(option));
      expect(bold?.textContent ?? '').not.toContain(option.title);
      expect(host.textContent).toContain(option.title);
      const tag = host.querySelector('app-custom-tag');
      expect(tag).not.toBeNull();
      expect(tag?.textContent).toContain(option.result_status?.name);
      expect(renderedSelect(label).querySelector('app-custom-tag')).toBeNull();
      view.destroy();
    }
  });

  it('renders both innovation pickers with virtual scroll off', async () => {
    await arrange({ editable: true, development: 'options', use: 'options' });

    expect(primeSelect(INNOVATION_DEVELOPMENT_LABEL).virtualScroll).toBe(false);
    expect(primeSelect(INNOVATION_USE_LABEL).virtualScroll).toBe(false);
  });

  it('renders both innovation pickers with the link panel class', async () => {
    await arrange({ editable: true, development: 'options', use: 'options' });

    expect(primeSelect(INNOVATION_DEVELOPMENT_LABEL).panelStyleClass).toBe('policy-change-link-panel');
    expect(primeSelect(INNOVATION_USE_LABEL).panelStyleClass).toBe('policy-change-link-panel');
  });

  it('drops the Innovation Use label padding hack (NFR-PCIL-002)', async () => {
    await arrange({ editable: true, development: 'options', use: 'options' });

    const label = pickerHost(INNOVATION_USE_LABEL).querySelector('label')?.textContent ?? '';
    expect(label.replace(/\u00A0/g, ' ').trim()).toBe(INNOVATION_USE_LABEL);
    expect(label).not.toContain('\u00A0');
  });
});
