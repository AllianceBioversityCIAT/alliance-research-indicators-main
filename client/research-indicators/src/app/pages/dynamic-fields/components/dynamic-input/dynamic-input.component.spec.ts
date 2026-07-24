import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { DynamicInputComponent } from './dynamic-input.component';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';

describe('DynamicInputComponent', () => {
  let component: DynamicInputComponent;
  let fixture: ComponentFixture<DynamicInputComponent>;
  let formBuilder: FormBuilder;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicInputComponent, ReactiveFormsModule, FloatLabelModule, InputTextModule],
      providers: [FormBuilder]
    }).compileComponents();

    formBuilder = TestBed.inject(FormBuilder);
    fixture = TestBed.createComponent(DynamicInputComponent);
    component = fixture.componentInstance;

    // Set the input properties
    component.field = { name: 'testAttr', label: 'Test Attribute', inputType: 'text' };
    component.formGroup = formBuilder.group({
      testAttr: ['']
    });

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
