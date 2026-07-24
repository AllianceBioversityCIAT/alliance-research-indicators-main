import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { DynamicComponentSelectorComponent } from './dynamic-component-selector.component';

describe('DynamicComponentSelectorComponent', () => {
  let component: DynamicComponentSelectorComponent;
  let fixture: ComponentFixture<DynamicComponentSelectorComponent>;
  let formBuilder: FormBuilder;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicComponentSelectorComponent, ReactiveFormsModule],
      providers: [FormBuilder]
    }).compileComponents();

    formBuilder = TestBed.inject(FormBuilder);
    fixture = TestBed.createComponent(DynamicComponentSelectorComponent);
    component = fixture.componentInstance;

    // Create a FormGroup and assign it to the component
    component.formGroup = formBuilder.group({
      nombree: [''],
      edad: ['']
    });

    // Set a sample field input with correct property for formControlName
    component.field = {
      type: 'section',
      fields: [
        { type: 'input', name: 'nombree', id: 11, validations: { required: true } },
        { type: 'input', name: 'edad', id: 102, validations: { required: false, min: 18 } }
      ]
    };

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
