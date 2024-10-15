import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import DynamicFieldsComponent from './dynamic-fields.component';
import { DynamicFieldsService } from './dynamic-fields.service';
import { ApiService } from '../../shared/services/api.service';
import { of } from 'rxjs';
import { DynamicComponentSelectorService } from './components/dynamic-component-selector/dynamic-component-selector.service';
import { CacheService } from '../../shared/services/cache.service';

describe('DynamicFieldsComponent', () => {
  let component: DynamicFieldsComponent;
  let fixture: ComponentFixture<DynamicFieldsComponent>;
  let mockDynamicFieldsService: Partial<DynamicFieldsService>;
  let formBuilder: FormBuilder;

  beforeEach(async () => {
    formBuilder = new FormBuilder();
    mockDynamicFieldsService = {
      init: jest.fn(),
      formGroup: formBuilder.group({}),
      flattenFieldsList: []
    };

    await TestBed.configureTestingModule({
      imports: [DynamicFieldsComponent, ReactiveFormsModule],
      providers: [
        { provide: DynamicFieldsService, useValue: mockDynamicFieldsService },
        { provide: ApiService, useValue: { GET_ViewComponents: jest.fn().mockReturnValue(of([])) } },
        { provide: DynamicComponentSelectorService, useValue: { fields: [] } },
        { provide: CacheService, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicFieldsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
