import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { QuantificationItemComponent, QuantificationItemData } from './quantification-item.component';
import { SubmissionService } from '@shared/services/submission.service';
import { SimpleChange } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { TextareaComponent } from '@shared/components/custom-fields/textarea/textarea.component';

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

  // @akili-spec docs/specs/innovation-use/details-page (T-03 — promoted to shared/, fieldsRequired + maxFractionDigits)
  describe('maxFractionDigits input (T-03)', () => {
    it('defaults to undefined and leaves the Number field\'s rendered binding unchanged', () => {
      expect(component.maxFractionDigits).toBeUndefined();
      fixture.detectChanges();

      const inputs = fixture.debugElement.queryAll(By.directive(InputComponent));
      const numberInput = inputs[0].componentInstance as InputComponent;
      expect(numberInput.maxFractionDigits).toBeUndefined();
    });

    it('is forwarded to the Number field only, not Unit', () => {
      component.maxFractionDigits = 0;
      fixture.detectChanges();

      const inputs = fixture.debugElement.queryAll(By.directive(InputComponent));
      const [numberInput, unitInput] = inputs.map(i => i.componentInstance as InputComponent);
      expect(numberInput.maxFractionDigits).toBe(0);
      expect(unitInput.maxFractionDigits).toBeUndefined();
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

