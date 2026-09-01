import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { QuantificationItemComponent, QuantificationItemData } from './quantification-item.component';
import { SubmissionService } from '@shared/services/submission.service';
import { SimpleChange } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { TextareaComponent } from '@shared/components/custom-fields/textarea/textarea.component';
import { InputNumber } from 'primeng/inputnumber';

describe('QuantificationItemComponent', () => {
  let component: QuantificationItemComponent;
  let fixture: ComponentFixture<QuantificationItemComponent>;
  let submissionServiceMock: jest.Mocked<SubmissionService>;

  beforeEach(async () => {
    submissionServiceMock = {
      isEditableStatus: jest.fn().mockReturnValue(true)
    } as any;

    await TestBed.configureTestingModule({
      imports: [QuantificationItemComponent, HttpClientTestingModule],
      providers: [
        { provide: SubmissionService, useValue: submissionServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(QuantificationItemComponent);
    component = fixture.componentInstance;
  });

  it('should not emit from effect when not initialized (cover line 32 branch)', () => {
    const emitSpy = jest.spyOn(component.update, 'emit');
    TestBed.flushEffects();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input properties', () => {
    it('should have default values', () => {
      expect(component.quantNumber).toBe(1);
      expect(component.headerLabel).toBe('ACTUAL COUNT');
    });

    it('should accept quantification input', () => {
      const data: QuantificationItemData = {
        number: 10,
        unit: 'kg',
        comments: 'Test comments'
      };
      component.quantification = data;
      expect(component.quantification).toEqual(data);
    });

    it('should accept index input', () => {
      component.index = 5;
      expect(component.index).toBe(5);
    });

    it('should accept quantNumber input', () => {
      component.quantNumber = 3;
      expect(component.quantNumber).toBe(3);
    });

    it('should accept headerLabel input', () => {
      component.headerLabel = 'Custom Label';
      expect(component.headerLabel).toBe('Custom Label');
    });

    it('should default disabled to false', () => {
      expect(component.disabled).toBe(false);
    });
  });

  describe('disabled input (F-4)', () => {
    it('leaves Number, Unit and Comments enabled by default', () => {
      fixture.detectChanges();

      const inputs = fixture.debugElement.queryAll(By.directive(InputComponent));
      const textareas = fixture.debugElement.queryAll(By.directive(TextareaComponent));

      expect(inputs.length).toBe(2);
      inputs.forEach(i => expect((i.componentInstance as InputComponent).disabled).toBe(false));
      expect(textareas.length).toBe(1);
      expect((textareas[0].componentInstance as TextareaComponent).disabled).toBe(false);
    });

    it('disables Number, Unit and Comments when true (external result)', () => {
      component.disabled = true;
      fixture.detectChanges();

      const inputs = fixture.debugElement.queryAll(By.directive(InputComponent));
      const textareas = fixture.debugElement.queryAll(By.directive(TextareaComponent));

      expect(inputs.length).toBe(2);
      inputs.forEach(i => expect((i.componentInstance as InputComponent).disabled).toBe(true));
      expect(textareas.length).toBe(1);
      expect((textareas[0].componentInstance as TextareaComponent).disabled).toBe(true);
    });
  });

  // @akili-spec docs/specs/innovation-use/details-page (T-03 — promoted to shared/, fieldsRequired + maxFractionDigits)
  describe('fieldsRequired rendering (T-03, baseline established before the inputs existed)', () => {
    it('reproduces the field-asymmetric rendering: Number and Unit carry isRequired+validateEmpty, Comments carries isRequired only, all three show an asterisk', () => {
      fixture.detectChanges();

      const inputs = fixture.debugElement.queryAll(By.directive(InputComponent));
      const textareas = fixture.debugElement.queryAll(By.directive(TextareaComponent));

      expect(inputs.length).toBe(2);
      const [numberInput, unitInput] = inputs.map(i => i.componentInstance as InputComponent);
      expect(numberInput.isRequired).toBe(true);
      expect(numberInput.validateEmpty).toBe(true);
      expect(unitInput.isRequired).toBe(true);
      expect(unitInput.validateEmpty).toBe(true);

      expect(textareas.length).toBe(1);
      const commentsTextarea = textareas[0].componentInstance as TextareaComponent;
      expect(commentsTextarea.isRequired).toBe(true);
      expect((commentsTextarea as any).validateEmpty).toBeUndefined();

      const asterisks = fixture.debugElement.queryAll(By.css('h2.label span'));
      expect(asterisks.length).toBe(3);
    });

    it('defaults to true', () => {
      expect(component.fieldsRequired).toBe(true);
    });

    it('false drops the asterisks and the required validation on all three fields', () => {
      component.fieldsRequired = false;
      fixture.detectChanges();

      const inputs = fixture.debugElement.queryAll(By.directive(InputComponent));
      const textareas = fixture.debugElement.queryAll(By.directive(TextareaComponent));

      expect(inputs.length).toBe(2);
      const [numberInput, unitInput] = inputs.map(i => i.componentInstance as InputComponent);
      expect(numberInput.isRequired).toBe(false);
      expect(numberInput.validateEmpty).toBe(false);
      expect(unitInput.isRequired).toBe(false);
      expect(unitInput.validateEmpty).toBe(false);

      expect(textareas.length).toBe(1);
      const commentsTextarea = textareas[0].componentInstance as TextareaComponent;
      expect(commentsTextarea.isRequired).toBe(false);

      const asterisks = fixture.debugElement.queryAll(By.css('h2.label span'));
      expect(asterisks.length).toBe(0);
    });
  });

  // @akili-spec docs/specs/changes/measure-number-signed-decimal (T-10 — DD-12: default changed from undefined to 0)
  describe('maxFractionDigits input (T-10 — default changed to 0, R-MSD-002 AC.5)', () => {
    it('defaults to 0 — the scale-domain floor — and forwards it to the Number field\'s rendered binding, not Unit', () => {
      expect(component.maxFractionDigits).toBe(0);
      fixture.detectChanges();

      const inputs = fixture.debugElement.queryAll(By.directive(InputComponent));
      const [numberInput, unitInput] = inputs.map(i => i.componentInstance as InputComponent);
      expect(numberInput.maxFractionDigits).toBe(0);
      expect(unitInput.maxFractionDigits).toBeUndefined();
    });

    it('a non-default value is forwarded to the Number field only, not Unit', () => {
      component.maxFractionDigits = 2;
      fixture.detectChanges();

      const inputs = fixture.debugElement.queryAll(By.directive(InputComponent));
      const [numberInput, unitInput] = inputs.map(i => i.componentInstance as InputComponent);
      expect(numberInput.maxFractionDigits).toBe(2);
      expect(unitInput.maxFractionDigits).toBeUndefined();
    });
  });

  // @akili-spec docs/specs/changes/measure-number-signed-decimal (T-10 — R-MSD-012 AC.1: scale-domain guard is PRODUCTION behaviour here, not a test-side helper. T-09 discharged this only with a test-side reimplementation and its Reviewer ruled hosting the guard in app-input would be drift, so it is re-proved here against the real @Input setter.)
  describe('maxFractionDigits scale-domain guard (R-MSD-012 AC.1)', () => {
    it('rejects a value above the declared domain as a configuration error, thrown from the real @Input setter — not silently clamped', () => {
      // fixture.componentRef.setInput() is Angular's own input-delivery transition (KZ-015): it is
      // exactly what a parent template's [maxFractionDigits] binding does, not a bypass of it.
      expect(() => fixture.componentRef.setInput('maxFractionDigits', 5)).toThrow(/scale domain 0-4/);
    });

    it('rejects a value below the declared domain the same way', () => {
      expect(() => fixture.componentRef.setInput('maxFractionDigits', -1)).toThrow(/scale domain 0-4/);
    });

    it('accepts every value inside the declared domain 0–4 without throwing, and forwards each to the real property', () => {
      [0, 1, 2, 3, 4].forEach(value => {
        expect(() => fixture.componentRef.setInput('maxFractionDigits', value)).not.toThrow();
        expect(component.maxFractionDigits).toBe(value);
      });
    });

    it('rejects null even though a plain range check would let it through (null >= 0 and null <= 4 both coerce to true)', () => {
      expect(() => fixture.componentRef.setInput('maxFractionDigits', null)).toThrow(/scale domain 0-4/);
    });

    it('rejects a non-integer inside the numeric range, e.g. 2.5 (a plain range check would let it through and Intl would silently floor it to 2)', () => {
      expect(() => fixture.componentRef.setInput('maxFractionDigits', 2.5)).toThrow(/scale domain 0-4/);
    });
  });

  // @akili-spec docs/specs/changes/measure-number-signed-decimal (T-10 — DD-4: min/max/placeholder promoted to inputs, R-MSD-002 AC.1/AC.2/AC.3/AC.4/AC.6)
  describe('min / max / placeholder inputs (R-MSD-002 AC.1, AC.2, AC.6)', () => {
    it('with nothing passed, forwards today\'s literals to the real app-input instance on the Number field only', () => {
      fixture.detectChanges();

      const inputs = fixture.debugElement.queryAll(By.directive(InputComponent));
      const numberInput = inputs[0].componentInstance as InputComponent;

      expect(numberInput.min).toBe(0);
      expect(numberInput.max).toBe(Number.MAX_SAFE_INTEGER);
      expect(numberInput.placeholder).toBe('Enter a positive number');
    });

    it('non-default values reach the Number field\'s real app-input instance only — the Unit field is unaffected (AC.4)', () => {
      component.min = 5;
      component.max = 100;
      component.placeholder = 'Custom placeholder';
      fixture.detectChanges();

      const inputs = fixture.debugElement.queryAll(By.directive(InputComponent));
      const [numberInput, unitInput] = inputs.map(i => i.componentInstance as InputComponent);

      expect(numberInput.min).toBe(5);
      expect(numberInput.max).toBe(100);
      expect(numberInput.placeholder).toBe('Custom placeholder');

      // Unit's app-input carries no [min]/[max]/[placeholder] bindings from this card at all, so it
      // keeps app-input's OWN defaults untouched by the Number field's values.
      expect(unitInput.min).toBe(0);
      expect(unitInput.max).toBe(Number.MAX_SAFE_INTEGER);
      expect(unitInput.placeholder).toBe('Write the unit');
    });
  });

  // @akili-spec docs/specs/changes/measure-number-signed-decimal (T-10 — R-MSD-002 :222/:223 scenario, KZ-001/KZ-002)
  // Both OICR call sites (oicr-details.component.html:60-63 "ACTUAL COUNT" and :81-85 "EXTRAPOLATED
  // ESTIMATES") pass no min/max/maxFractionDigits/placeholder — Leader-verified grep, both blocks
  // identical in that respect. So rendering this card with NOTHING passed (below) is not "one call
  // site's" behaviour to enumerate; it is the one shared configuration both OICR blocks are bound to.
  // KNOWN GAP (not coverage): this equivalence is carried by the template grep above, not by an
  // assertion in this suite — nothing here reddens if an OICR block later binds a non-default
  // maxFractionDigits/min/max/placeholder. The natural closure (asserting against the real OICR
  // template) is blocked: oicr-details.component.spec.ts:873 renders a FakeQuantificationItemComponent
  // stub, not the real card, and de-stubbing that spec is outside this task.
  describe('rendered integer behaviour with nothing passed — the one shared OICR configuration, not by enumerating call sites (:222, :223)', () => {
    it('the real, unstubbed PrimeNG instance formats a fractional value with no decimal digits', () => {
      fixture.detectChanges();

      const inputNumberDe = fixture.debugElement.query(By.directive(InputNumber));
      const inputNumberInstance = inputNumberDe.componentInstance as InputNumber;

      // formatValue() is PrimeNG's own rendering method (also used by updateInput() and the paste
      // path), called here unmocked on the real instance — so this assertion IS the measurement of
      // what maxFractionDigits actually forwarded to PrimeNG produces, not the class field that holds
      // it (KZ-001): maximumFractionDigits:0 rounds 2.5 to "3" and -2.5 to "-3" (no decimal digits,
      // no dangling minus-sign read as a hyphen).
      //
      // NOTE ON SCOPE: this test observes only PrimeNG's formatValue() return value — no DOM text and
      // no ngModel write-back is asserted here, so it does not close U-11 (that gate needs a rendered
      // value and/or a write-back observation, not just the formatter's return value).
      expect(inputNumberInstance.formatValue(2.5)).toBe('3');
      expect(inputNumberInstance.formatValue(-2.5)).toBe('-3');
    });
  });

  describe('ngOnInit', () => {
    it('should initialize body with quantification data', () => {
      const data: QuantificationItemData = {
        number: 5,
        unit: 'units',
        comments: 'Initial comments'
      };
      component.quantification = data;
      component.ngOnInit();

      expect(component.body()).toEqual(data);
      expect((component as any).initialized).toBe(true);
    });

    it('should initialize body with default values if quantification is undefined', () => {
      component.quantification = undefined as any;
      component.ngOnInit();

      expect(component.body()).toEqual({ number: null, unit: '', comments: '' });
      expect((component as any).initialized).toBe(true);
    });

    it('should initialize body with default values if quantification is null', () => {
      component.quantification = null as any;
      component.ngOnInit();

      expect(component.body()).toEqual({ number: null, unit: '', comments: '' });
    });
  });

  describe('ngOnChanges', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should update body when quantification changes', () => {
      const initialData: QuantificationItemData = {
        number: 1,
        unit: 'unit1',
        comments: 'comment1'
      };
      component.quantification = initialData;
      component.body.set(initialData);

      const newData: QuantificationItemData = {
        number: 2,
        unit: 'unit2',
        comments: 'comment2'
      };
      component.quantification = newData;

      const changes: SimpleChanges = {
        quantification: new SimpleChange(initialData, newData, false)
      };

      component.ngOnChanges(changes);

      expect(component.body()).toEqual(newData);
    });

    it('should not update body if values are the same', () => {
      const data: QuantificationItemData = {
        number: 5,
        unit: 'kg',
        comments: 'test'
      };
      component.quantification = data;
      component.body.set(data);

      const changes: SimpleChanges = {
        quantification: new SimpleChange(data, data, false)
      };

      const setSpy = jest.spyOn(component.body, 'set');
      component.ngOnChanges(changes);

      expect(setSpy).not.toHaveBeenCalled();
    });

    it('should not update if not initialized', () => {
      (component as any).initialized = false;
      const data: QuantificationItemData = {
        number: 1,
        unit: 'unit',
        comments: 'comment'
      };
      component.quantification = data;

      const changes: SimpleChanges = {
        quantification: new SimpleChange(undefined, data, false)
      };

      component.ngOnChanges(changes);

      expect(component.body().number).toBeNull();
    });

    it('should handle undefined quantification in changes', () => {
      const changes: SimpleChanges = {
        quantification: new SimpleChange(undefined, undefined, false)
      };

      component.ngOnChanges(changes);

      expect(component.body()).toEqual({ number: null, unit: '', comments: '' });
    });

    it('should not update if quantification change is not present', () => {
      const initialData: QuantificationItemData = {
        number: 1,
        unit: 'unit',
        comments: 'comment'
      };
      component.body.set(initialData);

      const changes: SimpleChanges = {};

      component.ngOnChanges(changes);

      expect(component.body()).toEqual(initialData);
    });
  });

  describe('valueEffect', () => {
    it('should emit update when body changes after initialization', fakeAsync(() => {
      const emitSpy = jest.spyOn(component.update, 'emit');
      
      // Initialize component
      component.ngOnInit();
      tick();
      flush();
      fixture.detectChanges();
      
      // Clear initial emission from ngOnInit
      emitSpy.mockClear();

      // Change body after initialization
      component.body.set({ number: 5, unit: 'kg', comments: 'test' });
      tick();
      flush();
      fixture.detectChanges();

      expect(emitSpy).toHaveBeenCalledWith({ number: 5, unit: 'kg', comments: 'test' });
    }));

    it('should not emit update when initialized is false (covers line 32 return)', () => {
      // Create a new component instance
      const newFixture = TestBed.createComponent(QuantificationItemComponent);
      const newComponent = newFixture.componentInstance;
      const emitSpy = jest.spyOn(newComponent.update, 'emit');
      
      // Ensure initialized is false (it should be by default)
      expect((newComponent as any).initialized).toBe(false);

      // The effect runs when the component is created, but since initialized is false,
      // it should return early on line 32 without emitting
      // We verify that the effect did not emit (or only emitted the default empty value during creation)
      // The key is that when body changes before initialization, the return on line 32 prevents emission
      
      // Change body before initialization - this should trigger the effect
      // The effect will execute, but the return statement on line 32 should prevent emission
      newComponent.body.set({ number: 5, unit: 'kg', comments: 'test' });
      newFixture.detectChanges();

      // The effect should not emit new values because initialized is false
      // The return statement on line 32 should prevent emission
      // Note: The effect may have been called during component creation, but those calls
      // should have also returned early on line 32 since initialized was false
      // We verify that no calls were made with the new value we set
      const callsWithNewValue = emitSpy.mock.calls.filter(call => 
        call[0]?.number === 5 && call[0]?.unit === 'kg'
      );
      expect(callsWithNewValue).toHaveLength(0);
    });

    it('should emit update when body changes multiple times after initialization', fakeAsync(() => {
      const emitSpy = jest.spyOn(component.update, 'emit');
      
      // Initialize component
      component.ngOnInit();
      tick();
      flush();
      fixture.detectChanges();
      
      // Clear initial emission from ngOnInit
      emitSpy.mockClear();

      // First change
      component.body.set({ number: 5, unit: 'kg', comments: 'test' });
      tick();
      flush();
      fixture.detectChanges();

      // Second change
      component.body.set({ number: 10, unit: 'liters', comments: 'updated' });
      tick();
      flush();
      fixture.detectChanges();

      expect(emitSpy).toHaveBeenCalledTimes(2);
      expect(emitSpy).toHaveBeenNthCalledWith(1, { number: 5, unit: 'kg', comments: 'test' });
      expect(emitSpy).toHaveBeenNthCalledWith(2, { number: 10, unit: 'liters', comments: 'updated' });
    }));
  });

  describe('onValueChange', () => {
    it('should emit update with current body data', () => {
      const data: QuantificationItemData = {
        number: 10,
        unit: 'units',
        comments: 'comments'
      };
      component.body.set(data);
      jest.spyOn(component.update, 'emit');

      component.onValueChange();

      expect(component.update.emit).toHaveBeenCalledWith(data);
    });
  });

  // @akili-spec docs/specs/innovation-use/details-page (R2 — remediation of validation-report.md A-2:
  // the delete control was a <div> with no role/tabindex/aria-label — unfocusable and unnamed,
  // R-IUP-018 AC.1/AC.2. Positive control: assert the control IS focusable and IS named, not merely
  // that it renders.)
  describe('delete control accessibility (R-IUP-018 AC.1/AC.2)', () => {
    it('renders the delete control as a native, focusable button carrying a non-empty English accessible name', () => {
      component.quantNumber = 2;
      component.headerLabel = 'MEASURE';
      fixture.detectChanges();

      const deleteButton: HTMLButtonElement = fixture.debugElement.query(By.css('button[aria-label]')).nativeElement;

      // Focusable: a native <button> (unlike a plain <div>) is a member of the default tab order —
      // no [tabindex] is required to receive focus, and none is added defensively.
      expect(deleteButton.tagName).toBe('BUTTON');
      expect(deleteButton.type).toBe('button');
      expect(deleteButton.tabIndex).not.toBe(-1);

      // Named: the accessible name is non-empty and in English, deriving from the two inputs that
      // vary per row so screen-reader users can tell rows apart ("Remove MEASURE 2").
      const accessibleName = deleteButton.getAttribute('aria-label');
      expect(accessibleName).toBe('Remove MEASURE 2');
      expect(accessibleName?.trim().length).toBeGreaterThan(0);
    });

    it('fires onDelete() on click, still reachable from the native button', () => {
      fixture.detectChanges();
      jest.spyOn(component, 'onDelete');

      const deleteButton: HTMLButtonElement = fixture.debugElement.query(By.css('button[aria-label]')).nativeElement;
      deleteButton.click();

      expect(component.onDelete).toHaveBeenCalled();
    });

    it('omits the delete control entirely when not editable, matching the surrounding disabled-state pattern', () => {
      submissionServiceMock.isEditableStatus.mockReturnValue(false);
      fixture.detectChanges();

      const deleteButton = fixture.debugElement.query(By.css('button[aria-label]'));
      expect(deleteButton).toBeNull();
    });
  });

  describe('onDelete', () => {
    it('should emit delete when status is editable', () => {
      submissionServiceMock.isEditableStatus.mockReturnValue(true);
      jest.spyOn(component.delete, 'emit');

      component.onDelete();

      expect(component.delete.emit).toHaveBeenCalled();
    });

    it('should not emit delete when status is not editable', () => {
      submissionServiceMock.isEditableStatus.mockReturnValue(false);
      jest.spyOn(component.delete, 'emit');

      component.onDelete();

      expect(component.delete.emit).not.toHaveBeenCalled();
    });
  });

  describe('body signal', () => {
    it('should have default empty values', () => {
      expect(component.body()).toEqual({ number: null, unit: '', comments: '' });
    });

    it('should update body signal', () => {
      const newData: QuantificationItemData = {
        number: 20,
        unit: 'liters',
        comments: 'New comments'
      };
      component.body.set(newData);
      expect(component.body()).toEqual(newData);
    });
  });
});

