import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input, NO_ERRORS_SCHEMA, ContentChild, TemplateRef } from '@angular/core';
import { signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { OicrFormFieldsComponent } from './oicr-form-fields.component';
import { ApiService } from '@shared/services/api.service';
import { UtilsService } from '@shared/services/utils.service';
import { WordCountService } from '@shared/services/word-count.service';
import { ActionsService } from '@shared/services/actions.service';
import { RolesService } from '@shared/services/cache/roles.service';
import { CreateResultManagementService } from '../../all-modals/modals-content/create-result-modal/services/create-result-management.service';

// Lightweight stand-ins for the real field components, used only in the "disabled input (F-3)" suite below so
// the real template renders (instead of the '' override used elsewhere in this file) without pulling in the
// full CLARISA-backed dropdown machinery of app-select/app-textarea/app-input.
//
// StubSelectComponent projects the consumer's `#rows` ng-template (T-15 attempt 3 rework): the real
// select.component.ts declares `@ContentChild('rows') rowsTemplate?: TemplateRef<any>` and renders it via
// `*ngTemplateOutlet` OUTSIDE `<p-select>`, gated only by `!hideSelected && selectedOption()` — a
// `[disabled]` binding on `<app-select>` never reaches that projected content. A `template: ''` stub (as
// this class was before) never instantiates `#rows` at all, so it structurally cannot catch a guard
// regression inside it. Replicating the same @ContentChild + ngTemplateOutlet wiring here, fed a fake
// selected option, lets the projected content (and the `disabled`/`editingOicr()` guard inside it, which
// is evaluated in OicrFormFieldsComponent's own context per Angular content-projection semantics) actually
// render for assertions.
@Component({
  selector: 'app-select',
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    @if (rowsTemplate) {
      <ng-container *ngTemplateOutlet="rowsTemplate; context: { $implicit: fakeSelectedOption }"></ng-container>
    }
  `
})
class StubSelectComponent {
  @Input() signal: unknown;
  @Input() optionLabel = '';
  @Input() optionLabel2 = '';
  @Input() optionValue: unknown;
  @Input() customFilterBy = '';
  @Input() serviceName = '';
  @Input() label = '';
  @Input() helperText = '';
  @Input() disabled = false;
  @Input() disableFilter = false;
  @Input() scrollHeight = '';
  @Input() placeholder = '';
  @Input() isRequired = false;
  @Input() hideSelected = true;
  @Input() textSpan = '';

  @ContentChild('rows') rowsTemplate?: TemplateRef<unknown>;

  fakeSelectedOption = { external_id: 'LAC-2501', title: 'Fake OICR', maturity_level: 'High', report_year: 2024 };
}

@Component({ selector: 'app-textarea', standalone: true, template: '' })
class StubTextareaComponent {
  @Input() signal: unknown;
  @Input() optionValue = '';
  @Input() label = '';
  @Input() helperText = '';
  @Input() isRequired = false;
  @Input() disabled = false;
  @Input() rows = 10;
  @Input() maxLength = 40000;
  @Input() aiAssistantFunction?: () => void;
  @Input() isAiDisabled = false;
  @Input() isAiLoading = false;
  @Input() aiError = '';
  @Input() onRetry?: () => void;
  @Input() placeholder = '';
}

@Component({ selector: 'app-input', standalone: true, template: '' })
class StubInputComponent {
  @Input() signal: unknown;
  @Input() optionValue = '';
  @Input() label = '';
  @Input() helperText = '';
  @Input() isRequired = false;
  @Input() disabled = false;
  @Input() placeholder = '';
  @Input() pattern = '';
}

describe('OicrFormFieldsComponent', () => {
  let component: OicrFormFieldsComponent;
  let fixture: ComponentFixture<OicrFormFieldsComponent>;

  let apiMock: jest.Mocked<ApiService>;
  let utilsMock: jest.Mocked<UtilsService>;
  let wordCountMock: jest.Mocked<WordCountService>;
  let actionsMock: jest.Mocked<ActionsService>;
  let rolesMock: Partial<RolesService> & { canEditOicr?: jest.Mock };
  let createResultMock: {
    autofillinOicr: WritableSignal<boolean>;
    createOicrBody: WritableSignal<any>;
    resultPageStep?: jest.Mock;
  } as any;

  beforeEach(async () => {
    apiMock = {
      GET_OICRMetadata: jest.fn(),
      fastResponse: jest.fn(),
    } as unknown as jest.Mocked<ApiService>;

    utilsMock = {
      getNestedPropertySignal: jest.fn(),
      setNestedPropertyWithReduceSignal: jest.fn(),
    } as unknown as jest.Mocked<UtilsService>;

    wordCountMock = {
      getWordCount: jest.fn().mockReturnValue(0),
    } as unknown as jest.Mocked<WordCountService>;

    actionsMock = {
      showToast: jest.fn(),
    } as unknown as jest.Mocked<ActionsService>;

    rolesMock = { canEditOicr: jest.fn().mockReturnValue(true) } as any;

    createResultMock = {
      autofillinOicr: signal(false),
      createOicrBody: signal({
        step_one: {},
        step_two: { primary_lever: [{ lever_id: '1' }, { lever_id: '2' }] },
        step_three: {},
      }),
      resultPageStep: jest.fn().mockReturnValue(1),
    } as any;

    await TestBed.configureTestingModule({
      imports: [OicrFormFieldsComponent],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: UtilsService, useValue: utilsMock },
        { provide: WordCountService, useValue: wordCountMock },
        { provide: ActionsService, useValue: actionsMock },
        { provide: RolesService, useValue: rolesMock },
        { provide: CreateResultManagementService, useValue: createResultMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideTemplate(OicrFormFieldsComponent, '')
      .compileComponents();

    fixture = TestBed.createComponent(OicrFormFieldsComponent);
    component = fixture.componentInstance;
    // default body
    component.body = signal<any>({});
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('showOicrSelection', () => {
    it('should return true for OICR creation with tagging array id 2 or 3', () => {
      component.body = signal<any>({ step_one: { tagging: [{ tag_id: 2 }] } });
      expect(component.showOicrSelection()).toBe(true);
      component.body = signal<any>({ step_one: { tagging: [{ tag_id: 3 }] } });
      expect(component.showOicrSelection()).toBe(true);
    });

    it('should return true for OICR creation with single tagging object id 3', () => {
      component.body = signal<any>({ step_one: { tagging: { tag_id: 3 } } });
      expect(component.showOicrSelection()).toBe(true);
    });

    it('should return false for OICR creation with single tagging object id 1', () => {
      component.body = signal<any>({ step_one: { tagging: { tag_id: 1 } } });
      expect(component.showOicrSelection()).toBe(false);
    });

    it('should return true for PatchOicr with tagging id 2', () => {
      component.body = signal<any>({ tagging: { tag_id: 2 } });
      expect(component.showOicrSelection()).toBe(true);
    });

    it('should return false for PatchOicr with tagging id 1', () => {
      component.body = signal<any>({ tagging: { tag_id: 1 } });
      expect(component.showOicrSelection()).toBe(false);
    });

    it('should return false otherwise', () => {
      component.body = signal<any>({ step_one: { tagging: [{ tag_id: 1 }] } });
      expect(component.showOicrSelection()).toBe(false);
      component.body = signal<any>({});
      expect(component.showOicrSelection()).toBe(false);
    });
  });

  it('onSelectOicr should delegate to getOicrMetadata', () => {
    const spy = jest.spyOn(component as any, 'getOicrMetadata').mockResolvedValue(undefined);
    component.onSelectOicr(99);
    expect(spy).toHaveBeenCalledWith(99);
  });

  it('clearOicrSelection default input function should be callable', () => {
    expect(() => component.clearOicrSelection()).not.toThrow();
  });

  describe('getOicrMetadata', () => {
    it('should early return when unsuccessfulRequest and keep autofillinOicr true', async () => {
      apiMock.GET_OICRMetadata.mockResolvedValue({ successfulRequest: false } as any);
      await component.getOicrMetadata(10);
      expect(createResultMock.autofillinOicr()).toBe(true);
    });

    it('should update createOicrBody on success and set autofillinOicr false', async () => {
      const response = {
        successfulRequest: true,
        data: {
          step_one: { outcome_impact_statement: 'S' },
          step_two: {
            contributor_lever: [
              { lever_id: '2' },
              { lever_id: '3' },
            ],
          },
          step_three: { comment_geo_scope: undefined },
        },
      } as any;
      apiMock.GET_OICRMetadata.mockResolvedValue(response);
      await component.getOicrMetadata(10);
      const body = createResultMock.createOicrBody();
      expect(body.step_one.outcome_impact_statement).toBe('S');
      expect(body.step_two.contributor_lever).toEqual([{ lever_id: 3 }]);
      expect(createResultMock.autofillinOicr()).toBe(false);
    });
  });

  describe('AI assistant', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      utilsMock.getNestedPropertySignal.mockReset();
      utilsMock.setNestedPropertyWithReduceSignal.mockReset();
      actionsMock.showToast.mockReset();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle success with output and empty existing content (success toast)', async () => {
      utilsMock.getNestedPropertySignal.mockReturnValueOnce('Elaboration').mockReturnValueOnce('');
      apiMock.fastResponse.mockResolvedValue({ successfulRequest: true, output: 'Generated' } as any);

      const promise = component.aiAssistantFunctionForShortOutcome();
      await Promise.resolve();
      jest.runOnlyPendingTimers();
      await promise;

      expect(actionsMock.showToast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });

    it('should handle success with output and existing content (info toast)', async () => {
      utilsMock.getNestedPropertySignal.mockReturnValueOnce('Elaboration').mockReturnValueOnce('Exists');
      apiMock.fastResponse.mockResolvedValue({ successfulRequest: true, output: 'Generated' } as any);
      await component.aiAssistantFunctionForShortOutcome();
      expect(actionsMock.showToast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'info' }));
    });

    it('should set error when no content generated', async () => {
      utilsMock.getNestedPropertySignal.mockReturnValue('Elaboration');
      apiMock.fastResponse.mockResolvedValue({ successfulRequest: true, output: '' } as any);
      await component.aiAssistantFunctionForShortOutcome();
      expect(component.aiError()).toBe('No content generated. Please try again.');
    });

    it('should set error when no content generated (undefined output)', async () => {
      utilsMock.getNestedPropertySignal.mockReturnValue('Elaboration');
      apiMock.fastResponse.mockResolvedValue({ successfulRequest: true } as any);
      await component.aiAssistantFunctionForShortOutcome();
      expect(component.aiError()).toBe('No content generated. Please try again.');
    });

    it('should set error when unsuccessfulRequest', async () => {
      utilsMock.getNestedPropertySignal.mockReturnValue('Elaboration');
      apiMock.fastResponse.mockResolvedValue({ successfulRequest: false } as any);
      await component.aiAssistantFunctionForShortOutcome();
      expect(component.aiError()).toBe('Generation failed. Please try again.');
    });

    it('should set error when fastResponse throws', async () => {
      utilsMock.getNestedPropertySignal.mockReturnValue('Elaboration');
      apiMock.fastResponse.mockRejectedValue(new Error('x'));
      await component.aiAssistantFunctionForShortOutcome();
      expect(component.aiError()).toBe('Generation failed. Please try again.');
    });

    it('should trigger timeout error and clear it in finally', async () => {
      utilsMock.getNestedPropertySignal.mockReturnValue('Elaboration');
      apiMock.fastResponse.mockImplementation(() => new Promise(() => {}));
      component.aiAssistantFunctionForShortOutcome();
      jest.advanceTimersByTime(30001);
      expect(component.aiError()).toBe('Request timed out. Please try again.');
    });
    
    it('should handle empty elaboration string and process output (covers empty-string branch)', async () => {
      utilsMock.getNestedPropertySignal
        .mockReturnValueOnce('')
        .mockReturnValueOnce('');
      apiMock.fastResponse.mockResolvedValue({ successfulRequest: true, output: 'Hello' } as any);
      await component.aiAssistantFunctionForShortOutcome();
      expect(actionsMock.showToast).toHaveBeenCalled();
    });
  });

  it('handleAiError should set error, show toast, and stop loading', () => {
    component['handleAiError']('msg');
    expect(component.aiError()).toBe('msg');
    expect(actionsMock.showToast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    expect(component.isAiLoading()).toBe(false);
  });

  it('clearAiTimeout should clear timeout and nullify id', () => {
    (component as any).aiTimeoutId = setTimeout(() => {}, 1000) as unknown as number;
    (component as any)['clearAiTimeout']();
    expect((component as any).aiTimeoutId).toBeNull();
  });

  it('onRetryAi should reset error and call aiAssistantFunctionForShortOutcome', () => {
    const spy = jest.spyOn(component as any, 'aiAssistantFunctionForShortOutcome').mockResolvedValue(undefined as any);
    component.aiError.set('e');
    component.onRetryAi();
    expect(component.aiError()).toBe('');
    expect(spy).toHaveBeenCalled();
  });

  describe('typeTextEffect', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('should early return if text equals current value', () => {
      utilsMock.getNestedPropertySignal.mockReturnValue('same');
      (component as any)['typeTextEffect']('same', 'path');
      expect(utilsMock.setNestedPropertyWithReduceSignal).not.toHaveBeenCalled();
    });

    it('should type characters and stop', () => {
      utilsMock.getNestedPropertySignal.mockReturnValue('');
      (component as any)['typeTextEffect']('Done', 'path');
      // simulate enough time
      jest.advanceTimersByTime(3500);
      jest.runOnlyPendingTimers();
      expect(utilsMock.setNestedPropertyWithReduceSignal).toHaveBeenCalled();
      expect(component.isTyping()).toBe(false);
    });
  });

  describe('disable and limit checks', () => {
    it('isShortOutcomeAiDisabled should reflect empty elaboration and flags', () => {
      utilsMock.getNestedPropertySignal.mockReturnValueOnce('   ');
      expect(component.isShortOutcomeAiDisabled()).toBe(true);

      utilsMock.getNestedPropertySignal.mockReturnValueOnce('text');
      component.isAiLoading.set(true);
      expect(component.isShortOutcomeAiDisabled()).toBe(true);
      component.isAiLoading.set(false);

      utilsMock.getNestedPropertySignal.mockReturnValueOnce('text');
      component.isTyping.set(true);
      expect(component.isShortOutcomeAiDisabled()).toBe(true);
      component.isTyping.set(false);
    });

    it('isElaborationTextExceedingLimit should use word count > 400', () => {
      utilsMock.getNestedPropertySignal.mockReturnValue('text');
      wordCountMock.getWordCount.mockReturnValueOnce(401);
      expect(component.isElaborationTextExceedingLimit()).toBe(true);
      wordCountMock.getWordCount.mockReturnValueOnce(100);
      expect(component.isElaborationTextExceedingLimit()).toBe(false);
    });

    it('getElaborationLimitMessage should return message', () => {
      expect(component.getElaborationLimitMessage().length).toBeGreaterThan(0);
    });

    it('isShortOutcomeAiDisabled should be true when text exceeds limit', () => {
      utilsMock.getNestedPropertySignal.mockReturnValue('some long text');
      jest.spyOn(component, 'isElaborationTextExceedingLimit').mockReturnValue(true);
      component.isAiLoading.set(false);
      component.isTyping.set(false);
      expect(component.isShortOutcomeAiDisabled()).toBe(true);
      (component.isElaborationTextExceedingLimit as jest.Mock).mockRestore?.();
    });

    it('isShortOutcomeAiDisabled should be false when text present and flags off and within limit', () => {
      utilsMock.getNestedPropertySignal.mockReturnValue('valid text');
      jest.spyOn(component, 'isElaborationTextExceedingLimit').mockReturnValue(false);
      component.isAiLoading.set(false);
      component.isTyping.set(false);
      expect(component.isShortOutcomeAiDisabled()).toBe(false);
      (component.isElaborationTextExceedingLimit as jest.Mock).mockRestore?.();
    });

    it('isShortOutcomeAiDisabled should be true when elaboration is undefined (nullish -> empty)', () => {
      utilsMock.getNestedPropertySignal.mockReturnValue(undefined as any);
      component.isAiLoading.set(false);
      component.isTyping.set(false);
      jest.spyOn(component, 'isElaborationTextExceedingLimit').mockReturnValue(false);
      expect(component.isShortOutcomeAiDisabled()).toBe(true);
      (component.isElaborationTextExceedingLimit as jest.Mock).mockRestore?.();
    });

    it('isElaborationTextExceedingLimit should be false when elaboration undefined (fallback to empty)', () => {
      utilsMock.getNestedPropertySignal.mockReturnValue(undefined as any);
      wordCountMock.getWordCount.mockReturnValue(0);
      expect(component.isElaborationTextExceedingLimit()).toBe(false);
    });
  });

  describe('disabled input (F-3 — shared with the create-result modal)', () => {
    let disabledFixture: ComponentFixture<OicrFormFieldsComponent>;
    let disabledComponent: OicrFormFieldsComponent;

    beforeEach(async () => {
      // The real template references createResultManagementService.editingOicr()/statusId() directly —
      // the outer describe's overrideTemplate('') never exercises them, so provide them here.
      (createResultMock as any).editingOicr = signal(false);
      (createResultMock as any).statusId = signal(0);
      utilsMock.getNestedPropertySignal.mockReturnValue('');

      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [OicrFormFieldsComponent],
        providers: [
          { provide: ApiService, useValue: apiMock },
          { provide: UtilsService, useValue: utilsMock },
          { provide: WordCountService, useValue: wordCountMock },
          { provide: ActionsService, useValue: actionsMock },
          { provide: RolesService, useValue: rolesMock },
          { provide: CreateResultManagementService, useValue: createResultMock }
        ]
      })
        .overrideComponent(OicrFormFieldsComponent, {
          set: {
            imports: [CommonModule, TooltipModule, StubSelectComponent, StubTextareaComponent, StubInputComponent]
          }
        })
        .compileComponents();

      disabledFixture = TestBed.createComponent(OicrFormFieldsComponent);
      disabledComponent = disabledFixture.componentInstance;
      disabledComponent.body = signal<any>({});
    });

    it('defaults to false so existing consumers (e.g. the create-result modal) are unaffected', () => {
      disabledFixture.detectChanges();
      expect(disabledComponent.disabled).toBe(false);

      const selects = disabledFixture.debugElement.queryAll(By.directive(StubSelectComponent));
      expect(selects.length).toBeGreaterThanOrEqual(2);
      expect(selects.every(sel => (sel.componentInstance as StubSelectComponent).disabled === false)).toBe(true);
    });

    it('disables Tagging, Maturity of change, Elaboration, Short Outcome and the AI-generate button for an external result', () => {
      // Non-empty elaboration text means isShortOutcomeAiDisabled() alone would be false —
      // proving the AI button is gated by the new `disabled` input, not an existing condition.
      utilsMock.getNestedPropertySignal.mockReturnValue('some elaboration text');
      disabledComponent.disabled = true;
      disabledFixture.detectChanges();

      const selects = disabledFixture.debugElement.queryAll(By.directive(StubSelectComponent));
      const textareas = disabledFixture.debugElement.queryAll(By.directive(StubTextareaComponent));

      // Tagging + Maturity of change reported
      expect(selects.length).toBeGreaterThanOrEqual(2);
      selects.forEach(sel => expect((sel.componentInstance as StubSelectComponent).disabled).toBe(true));

      // Only the two fields F-3 names — Elaboration and Short Outcome — are gated by `disabled`.
      // (General Comment is a third textarea on this tab but is not one of F-3's four findings.)
      const elaborationTextarea = textareas.find(
        t => (t.componentInstance as StubTextareaComponent).label === 'Elaboration of outcome/impact statement'
      );
      const shortOutcomeTextarea = textareas.find(t => (t.componentInstance as StubTextareaComponent).label === 'Short Outcome/Impact Statement');
      expect(elaborationTextarea).toBeDefined();
      expect(shortOutcomeTextarea).toBeDefined();
      expect((elaborationTextarea!.componentInstance as StubTextareaComponent).disabled).toBe(true);
      expect((shortOutcomeTextarea!.componentInstance as StubTextareaComponent).disabled).toBe(true);
      // AI-generate button reachability is gated through isAiDisabled — must be true even though the
      // elaboration text is non-empty (i.e. isShortOutcomeAiDisabled() alone would be false).
      expect((shortOutcomeTextarea!.componentInstance as StubTextareaComponent).isAiDisabled).toBe(true);
    });

    it('disables the "Select existing OICR" select for an external result once it is rendered', () => {
      // showOicrSelection() reads either the OicrCreation shape (body.step_one.tagging) or the PatchOicr
      // shape (body.tagging) directly on `body` — a PatchOicr body of { tagging: { tag_id: 2 } } satisfies
      // isPatchOicr (has a non-array `tagging` key) and tag_id 2, so showOicrSelection() returns true and
      // the "Select existing OICR" app-select is actually instantiated (unlike the outer body = signal({})
      // fixture, under which the control never renders and this gap survived undetected).
      disabledComponent.body = signal<any>({ tagging: { tag_id: 2 } });
      disabledComponent.disabled = true;
      disabledFixture.detectChanges();

      expect(disabledComponent.showOicrSelection()).toBe(true);

      const selects = disabledFixture.debugElement.queryAll(By.directive(StubSelectComponent));
      const oicrSelect = selects.find(sel => (sel.componentInstance as StubSelectComponent).label === 'Select existing OICR');
      expect(oicrSelect).toBeDefined();
      expect((oicrSelect!.componentInstance as StubSelectComponent).disabled).toBe(true);
    });

    it('leaves the "Select existing OICR" select enabled when disabled=false and not editingOicr', () => {
      disabledComponent.body = signal<any>({ tagging: { tag_id: 2 } });
      disabledComponent.disabled = false;
      disabledFixture.detectChanges();

      expect(disabledComponent.showOicrSelection()).toBe(true);

      const selects = disabledFixture.debugElement.queryAll(By.directive(StubSelectComponent));
      const oicrSelect = selects.find(sel => (sel.componentInstance as StubSelectComponent).label === 'Select existing OICR');
      expect(oicrSelect).toBeDefined();
      expect((oicrSelect!.componentInstance as StubSelectComponent).disabled).toBe(false);
    });

    describe('#rows clear icon guard (T-15 attempt 3 — closes the reviewer-found gap)', () => {
      // Reviewer finding: disabling app-select does NOT reach the projected `#rows` clear icon, because
      // select.component.html renders the `#rows` outlet OUTSIDE <p-select> (the only place [disabled] is
      // bound), gated solely by `!hideSelected && selectedOption()`. Prove the template guard at
      // oicr-form-fields.component.html:103 (`@if (!disabled && !editingOicr())`) actually controls the icon.
      beforeEach(() => {
        disabledComponent.body = signal<any>({ tagging: { tag_id: 2 }, link_result: { external_oicr_id: 5 } });
      });

      it('hides the pi-times-circle clear icon when disabled=true', () => {
        disabledComponent.disabled = true;
        disabledFixture.detectChanges();

        expect(disabledComponent.showOicrSelection()).toBe(true);
        const clearIcon = disabledFixture.debugElement.query(By.css('.pi-times-circle'));
        expect(clearIcon).toBeNull();
      });

      it('shows the pi-times-circle clear icon when disabled=false and not editingOicr', () => {
        disabledComponent.disabled = false;
        disabledFixture.detectChanges();

        expect(disabledComponent.showOicrSelection()).toBe(true);
        const clearIcon = disabledFixture.debugElement.query(By.css('.pi-times-circle'));
        expect(clearIcon).not.toBeNull();
      });
    });
  });
});


