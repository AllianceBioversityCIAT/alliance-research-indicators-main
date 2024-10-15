import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormGroup, FormBuilder } from '@angular/forms';
import { DynamicInputComponent } from './dynamic-input.component';
import { DynamicFieldsService } from '../../dynamic-fields.service';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';

describe('DynamicInputComponent', () => {
  let component: DynamicInputComponent;
  let fixture: ComponentFixture<DynamicInputComponent>;
  let formBuilder: FormBuilder;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicInputComponent, ReactiveFormsModule, FloatLabelModule, InputTextModule],
      providers: [
        FormBuilder,
        {
          provide: DynamicFieldsService,
          useValue: {
            formGroup: new FormGroup({})
          }
        }
      ]
    }).compileComponents();

    formBuilder = TestBed.inject(FormBuilder);
    fixture = TestBed.createComponent(DynamicInputComponent);
    component = fixture.componentInstance;

    // Set the input property
    component.attr = 'testAttr';

    // Provide a FormGroup to the component
    const formGroup = formBuilder.group({
      testAttr: ['']
    });
    (component['dynamicFieldsSE'] as any).formGroup = formGroup;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
