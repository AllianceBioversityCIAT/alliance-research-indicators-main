import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarInputComponent } from './calendar-input.component';
import { FormsModule } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { SkeletonModule } from 'primeng/skeleton';
import { CacheService } from '../../../services/cache/cache.service';
import { signal } from '@angular/core';

describe('CalendarInputComponent', () => {
  let component: CalendarInputComponent;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const mockCacheService = {
      currentResultIsLoading: signal(false)
    };

    await TestBed.configureTestingModule({
      imports: [CalendarInputComponent, FormsModule, CalendarModule, SkeletonModule],
      providers: [{ provide: CacheService, useValue: mockCacheService }]
    }).compileComponents();

    component = TestBed.createComponent(CalendarInputComponent).componentInstance;
    cacheService = TestBed.inject(CacheService) as jest.Mocked<CacheService>;

    // Initial component configuration
    component.signal = signal({});
    component.optionValue = 'testField';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.minDate).toBeNull();
    expect(component.maxDate).toBeNull();
    expect(component.isRequired).toBe(false);
    expect(component.disabled).toBe(false);
    expect(component.readonly).toBe(false);
    expect(component.placeholder).toBe('');
    expect(component.dateFormat).toBe('dd/mm/yy');
  });

  it('should validate required field with empty value', () => {
    component.isRequired = true;
    component.signal = signal({ testField: '' });
    component.optionValue = 'testField';

    expect(component.isInvalid()).toBe(true);
    expect(component.inputValid().valid).toBe(false);
    expect(component.inputValid().message).toBe('This field is required');
  });

  it('should validate required field with null value', () => {
    component.isRequired = true;
    component.signal = signal({ testField: null });
    component.optionValue = 'testField';

    expect(component.isInvalid()).toBe(true);
    expect(component.inputValid().valid).toBe(false);
    expect(component.inputValid().message).toBe('This field is required');
  });

  it('should not show validation error when field is valid', () => {
    component.isRequired = true;
    component.signal = signal({ testField: new Date() });
    component.optionValue = 'testField';

    expect(component.isInvalid()).toBe(false);
    expect(component.inputValid().valid).toBe(true);
    expect(component.inputValid().message).toBe('');
  });

  it('should handle setValue correctly', () => {
    const testDate = new Date();
    component.signal = signal({ testField: null });

    component.setValue(testDate.toISOString());

    expect(component.signal().testField).toBe(testDate.toISOString());
  });

  it('should handle setValue with null', () => {
    component.signal = signal({ testField: 'some value' });
    component.optionValue = 'testField';

    component.setValue(null as any);

    expect(component.signal().testField).toBe(null);
  });

  it('should handle setValue with empty string', () => {
    component.signal = signal({ testField: 'some value' });
    component.optionValue = 'testField';

    component.setValue('');

    expect(component.signal().testField).toBe('');
  });

  it('should handle inputValid when not required and empty', () => {
    component.isRequired = false;
    component.signal = signal({ testField: '' });
    component.optionValue = 'testField';

    const result = component.inputValid();
    expect(result.valid).toBe(true);
    expect(result.class).toBe('ng-valid ng-dirty');
    expect(result.message).toBe('');
  });

  it('should handle inputValid when not required and null', () => {
    component.isRequired = false;
    component.signal = signal({ testField: null });
    component.optionValue = 'testField';

    const result = component.inputValid();
    expect(result.valid).toBe(true);
    expect(result.class).toBe('ng-valid ng-dirty');
    expect(result.message).toBe('');
  });

  it('should handle isInvalid when not required', () => {
    component.isRequired = false;
    component.signal = signal({ testField: '' });
    component.optionValue = 'testField';

    expect(component.isInvalid()).toBe(false);
  });

  it('should handle inputValid computed property with empty value', () => {
    component.isRequired = true;
    component.signal = signal({ testField: '' });
    component.optionValue = 'testField';

    const result = component.inputValid();
    expect(result.valid).toBe(false);
    expect(result.class).toBe('ng-invalid ng-dirty');
    expect(result.message).toBe('This field is required');
  });

  it('should handle inputValid computed property with valid value', () => {
    component.signal = signal({ testField: new Date() });
    component.optionValue = 'testField';

    const result = component.inputValid();
    expect(result.valid).toBe(true);
    expect(result.class).toBe('ng-valid ng-dirty');
    expect(result.message).toBe('');
  });

  it('should handle readonly property', () => {
    component.readonly = true;
    expect(component.readonly).toBe(true);
  });

  it('should handle placeholder property', () => {
    component.placeholder = 'Select date';
    expect(component.placeholder).toBe('Select date');
  });

  it('should handle dateFormat property', () => {
    component.dateFormat = 'mm/dd/yy';
    expect(component.dateFormat).toBe('mm/dd/yy');
  });

  it('should handle setValue with null', () => {
    component.signal = signal({ testField: 'some value' });
    component.optionValue = 'testField';

    component.setValue(null as any);

    expect(component.signal().testField).toBe(null);
  });

  it('should handle setValue with empty string', () => {
    component.signal = signal({ testField: 'some value' });
    component.optionValue = 'testField';

    component.setValue('');

    expect(component.signal().testField).toBe('');
  });
});
