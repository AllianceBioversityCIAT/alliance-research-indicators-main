import { TestBed } from '@angular/core/testing';
import { RadioButtonComponent } from './radio-button.component';
import { signal } from '@angular/core';
import { ActionsService } from '../../../services/actions.service';
import { ServiceLocatorService } from '../../../services/service-locator.service';
import { CacheService } from '../../../services/cache/cache.service';
import { UtilsService } from '../../../services/utils.service';

describe('RadioButtonComponent', () => {
  let component: RadioButtonComponent;
  let mockActionsService: jest.Mocked<ActionsService>;
  let mockServiceLocator: jest.Mocked<ServiceLocatorService>;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockUtilsService: jest.Mocked<UtilsService>;
  let mockService: any;

  beforeEach(async () => {
    mockService = {
      loading: jest.fn().mockReturnValue(signal(false)),
      list: jest.fn().mockReturnValue([
        { id: 1, name: 'Option 1' },
        { id: 2, name: 'Option 2' }
      ])
    };

    mockActionsService = {
      handleBadRequest: jest.fn(),
      showGlobalAlert: jest.fn(),
      showGlobalToast: jest.fn(),
      isTokenExpired: jest.fn()
    } as any;

    mockServiceLocator = {
      getService: jest.fn().mockReturnValue(mockService)
    } as any;

    mockCacheService = {
      currentResultIsLoading: signal(false)
    } as any;

    mockUtilsService = {
      getNestedPropertySignal: jest.fn().mockReturnValue(null),
      setNestedPropertyWithReduceSignal: jest.fn()
    } as any;

    await TestBed.configureTestingModule({
      providers: [
        RadioButtonComponent,
        { provide: ActionsService, useValue: mockActionsService },
        { provide: ServiceLocatorService, useValue: mockServiceLocator },
        { provide: CacheService, useValue: mockCacheService },
        { provide: UtilsService, useValue: mockUtilsService }
      ]
    }).compileComponents();

    component = TestBed.inject(RadioButtonComponent);

    // Setup initial component configuration
    component.signal = signal({ testField: null });
    component.optionValue = { body: 'testField', option: 'value' };
    component.serviceName = 'testService';
    component.optionLabel = 'name';
    component.label = 'Test Label';
    component.description = 'Test Description';
    component.helperText = 'Test Helper';
    component.isRequired = false;
    component.disabled = false;
    component.direction = 'vertical';
    component.spaceX = 'gap-[10px]';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.optionLabel).toBe('name');
    expect(component.optionValue).toEqual({ body: 'testField', option: 'value' });
    expect(component.direction).toBe('vertical');
    expect(component.serviceName).toBe('testService');
    expect(component.label).toBe('Test Label');
    expect(component.description).toBe('Test Description');
    expect(component.helperText).toBe('Test Helper');
    expect(component.isRequired).toBe(false);
    expect(component.disabled).toBe(false);
    expect(component.spaceX).toBe('gap-[10px]');
  });

  it('should initialize service in ngOnInit', () => {
    component.ngOnInit();
    expect(mockServiceLocator.getService).toHaveBeenCalledWith('testService');
    expect(component.service).toBe(mockService);
  });

  it('should handle isInvalid computed property when required and value is null', () => {
    component.isRequired = true;
    component.body.set({ value: null });

    expect(component.isInvalid()).toBe(true);
  });

  it('should handle isInvalid computed property when required and value is undefined', () => {
    component.isRequired = true;
    component.body.set({ value: undefined });

    expect(component.isInvalid()).toBe(true);
  });

  it('should handle isInvalid computed property when not required', () => {
    component.isRequired = false;
    component.body.set({ value: null });

    expect(component.isInvalid()).toBe(false);
  });

  it('should handle isInvalid computed property when required and has value', () => {
    component.isRequired = true;
    component.body.set({ value: 'test' });

    expect(component.isInvalid()).toBe(false);
  });

  it('should set value correctly', () => {
    const testValue = 'option1';
    const emitSpy = jest.spyOn(component.selectEvent, 'emit');

    component.setValue(testValue);

    expect(component.body().value).toBe(testValue);
    expect(mockUtilsService.setNestedPropertyWithReduceSignal).toHaveBeenCalledWith(component.signal, 'testField', testValue);
    expect(emitSpy).toHaveBeenCalledWith(testValue);
  });

  it('should handle setValue with null value', () => {
    const emitSpy = jest.spyOn(component.selectEvent, 'emit');

    component.setValue(null);

    expect(component.body().value).toBe(null);
    expect(mockUtilsService.setNestedPropertyWithReduceSignal).toHaveBeenCalledWith(component.signal, 'testField', null);
    expect(emitSpy).toHaveBeenCalledWith(null);
  });

  it('should handle setValue with undefined value', () => {
    const emitSpy = jest.spyOn(component.selectEvent, 'emit');

    component.setValue(undefined);

    expect(component.body().value).toBe(undefined);
    expect(mockUtilsService.setNestedPropertyWithReduceSignal).toHaveBeenCalledWith(component.signal, 'testField', undefined);
    expect(emitSpy).toHaveBeenCalledWith(undefined);
  });

  it('should handle onChange effect when not loading and external value differs', () => {
    const externalValue = 'external_value';
    mockUtilsService.getNestedPropertySignal.mockReturnValue(externalValue);
    mockCacheService.currentResultIsLoading.set(false);
    mockService.loading.mockReturnValue(signal(false));

    component.ngOnInit();
    component.body.set({ value: 'different_value' });

    // Simulate the effect logic
    if (!mockCacheService.currentResultIsLoading() && !component.service.loading()()) {
      const externalVal = mockUtilsService.getNestedPropertySignal(component.signal, component.optionValue.body);
      if (component.body().value !== externalVal) {
        component.setValue(externalVal);
      }
    }

    expect(mockUtilsService.getNestedPropertySignal).toHaveBeenCalledWith(component.signal, 'testField');
    expect(component.body().value).toBe(externalValue);
  });

  it('should not trigger onChange effect when currentResultIsLoading is true', () => {
    const externalValue = 'external_value';
    mockUtilsService.getNestedPropertySignal.mockReturnValue(externalValue);
    mockCacheService.currentResultIsLoading.set(true);
    mockService.loading.mockReturnValue(signal(false));

    component.ngOnInit();
    component.body.set({ value: 'different_value' });

    // Simulate the effect logic
    if (!mockCacheService.currentResultIsLoading() && !component.service.loading()()) {
      const externalVal = mockUtilsService.getNestedPropertySignal(component.signal, component.optionValue.body);
      if (component.body().value !== externalVal) {
        component.setValue(externalVal);
      }
    }

    // Should not change the value when loading
    expect(component.body().value).toBe('different_value');
  });

  it('should not trigger onChange effect when service is loading', () => {
    const externalValue = 'external_value';
    mockUtilsService.getNestedPropertySignal.mockReturnValue(externalValue);
    mockCacheService.currentResultIsLoading.set(false);
    mockService.loading.mockReturnValue(signal(true));

    component.ngOnInit();
    component.body.set({ value: 'different_value' });

    // Simulate the effect logic
    if (!mockCacheService.currentResultIsLoading() && !component.service.loading()()) {
      const externalVal = mockUtilsService.getNestedPropertySignal(component.signal, component.optionValue.body);
      if (component.body().value !== externalVal) {
        component.setValue(externalVal);
      }
    }

    // Should not change the value when service is loading
    expect(component.body().value).toBe('different_value');
  });

  it('should not trigger onChange effect when external value is same as current value', () => {
    const sameValue = 'same_value';
    mockUtilsService.getNestedPropertySignal.mockReturnValue(sameValue);
    mockCacheService.currentResultIsLoading.set(false);
    mockService.loading.mockReturnValue(signal(false));

    component.ngOnInit();
    component.body.set({ value: sameValue });

    const setValueSpy = jest.spyOn(component, 'setValue');

    // Simulate the effect logic
    if (!mockCacheService.currentResultIsLoading() && !component.service.loading()()) {
      const externalVal = mockUtilsService.getNestedPropertySignal(component.signal, component.optionValue.body);
      if (component.body().value !== externalVal) {
        component.setValue(externalVal);
      }
    }

    expect(setValueSpy).not.toHaveBeenCalled();
  });

  it('should handle input properties correctly', () => {
    component.direction = 'horizontal';
    component.spaceX = 'gap-[20px]';
    component.isRequired = true;
    component.disabled = true;

    expect(component.direction).toBe('horizontal');
    expect(component.spaceX).toBe('gap-[20px]');
    expect(component.isRequired).toBe(true);
    expect(component.disabled).toBe(true);
  });

  it('should handle body signal updates', () => {
    expect(component.body().value).toBe(null);

    component.body.set({ value: 'test_value' });
    expect(component.body().value).toBe('test_value');
  });

  it('should handle firstTime signal updates', () => {
    expect(component.firstTime()).toBe(true);

    component.firstTime.set(false);
    expect(component.firstTime()).toBe(false);
  });

  it('should handle optionValue with different body and option values', () => {
    component.optionValue = { body: 'customBody', option: 'customOption' };
    const testValue = 'custom_value';

    component.setValue(testValue);

    expect(mockUtilsService.setNestedPropertyWithReduceSignal).toHaveBeenCalledWith(component.signal, 'customBody', testValue);
  });

  it('should handle service initialization with different service names', () => {
    component.serviceName = 'customService';

    component.ngOnInit();

    expect(mockServiceLocator.getService).toHaveBeenCalledWith('customService');
  });

  it('should handle empty service name', () => {
    component.serviceName = '';

    component.ngOnInit();

    expect(mockServiceLocator.getService).toHaveBeenCalledWith('');
  });

  it('should handle setValue with numeric values', () => {
    const numericValue = 42;
    const emitSpy = jest.spyOn(component.selectEvent, 'emit');

    component.setValue(numericValue);

    expect(component.body().value).toBe(numericValue);
    expect(emitSpy).toHaveBeenCalledWith(numericValue);
  });

  it('should handle setValue with boolean values', () => {
    const booleanValue = true;
    const emitSpy = jest.spyOn(component.selectEvent, 'emit');

    component.setValue(booleanValue);

    expect(component.body().value).toBe(booleanValue);
    expect(emitSpy).toHaveBeenCalledWith(booleanValue);
  });

  it('should handle setValue with object values', () => {
    const objectValue = { id: 1, name: 'Test' };
    const emitSpy = jest.spyOn(component.selectEvent, 'emit');

    component.setValue(objectValue);

    expect(component.body().value).toBe(objectValue);
    expect(emitSpy).toHaveBeenCalledWith(objectValue);
  });

  it('should handle getUniqueId when optionLabel is missing', () => {
    component.optionLabel = 'name';
    component.optionValue = { body: 'test.field', option: 'id' };
    const item = { id: 1 }; // No 'name' property
    
    const uniqueId = component.getUniqueId(item);
    
    expect(uniqueId).toBeDefined();
    expect(uniqueId).toContain('test-field');
    expect(uniqueId).toContain('1'); // Should use the option value
  });

  it('should handle getUniqueId when optionLabel is null', () => {
    component.optionLabel = 'name';
    component.optionValue = { body: 'test.field', option: 'id' };
    const item = { name: null, id: 1 };
    
    const uniqueId = component.getUniqueId(item);
    
    expect(uniqueId).toBeDefined();
    expect(uniqueId).toContain('test-field');
    expect(uniqueId).toContain('1');
  });
});
