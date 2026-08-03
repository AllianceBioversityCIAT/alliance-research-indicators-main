import { TestBed } from '@angular/core/testing';
import { TextareaComponent } from './textarea.component';
import { signal } from '@angular/core';
import { CacheService } from '../../../services/cache/cache.service';
import { TextareaValidationService } from '../../../services/textarea-validation.service';
import { UtilsService } from '../../../services/utils.service';

describe('TextareaComponent', () => {
  let component: TextareaComponent;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockTextareaValidationService: jest.Mocked<TextareaValidationService>;
  let mockUtilsService: jest.Mocked<UtilsService>;

  beforeEach(() => {
    mockCacheService = {
      currentResultIsLoading: signal(false)
    } as jest.Mocked<CacheService>;

    mockTextareaValidationService = {
      handlePasteText: jest.fn(),
      shouldPreventInput: jest.fn(),
      shouldPreventTextInput: jest.fn(),
      maxLength: 40000
    } as any;

    mockUtilsService = {
      getNestedPropertySignal: jest.fn(),
      setNestedPropertyWithReduceSignal: jest.fn(),
      setNestedPropertyWithReduce: jest.fn(),
      getNestedProperty: jest.fn()
    } as any;

    TestBed.configureTestingModule({
      providers: [
        { provide: CacheService, useValue: mockCacheService },
        { provide: TextareaValidationService, useValue: mockTextareaValidationService },
        { provide: UtilsService, useValue: mockUtilsService }
      ]
    });

    component = TestBed.createComponent(TextareaComponent).componentInstance;

    // Initialize signals and properties
    component.signal = signal({ testField: '' });
    component.optionValue = 'testField';
    component.body.set({ value: '' });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input properties', () => {
    it('should have default values', () => {
      expect(component.optionValue).toBe('testField');
      expect(component.label).toBe('');
      expect(component.helperText).toBe('');
      expect(component.description).toBe('');
      expect(component.isRequired).toBe(false);
      expect(component.disabled).toBe(false);
      expect(component.rows).toBe(10);
      expect(component.styleClass).toBe('');
      expect(component.size).toBe('');
      expect(component.placeholder).toBe('');
      expect(component.maxLength).toBe(40000);
    });

    it('should accept custom input values', () => {
      component.optionValue = 'test';
      component.label = 'Test Label';
      component.helperText = 'Helper text';
      component.description = 'Description';
      component.isRequired = true;
      component.disabled = true;
      component.rows = 5;
      component.styleClass = 'custom-class';
      component.size = 'large';
      component.placeholder = 'Enter text';
      component.maxLength = 1000;

      expect(component.optionValue).toBe('test');
      expect(component.label).toBe('Test Label');
      expect(component.helperText).toBe('Helper text');
      expect(component.description).toBe('Description');
      expect(component.isRequired).toBe(true);
      expect(component.disabled).toBe(true);
      expect(component.rows).toBe(5);
      expect(component.styleClass).toBe('custom-class');
      expect(component.size).toBe('large');
      expect(component.placeholder).toBe('Enter text');
      expect(component.maxLength).toBe(1000);
    });
  });

  describe('body signal', () => {
    it('should have initial value', () => {
      expect(component.body()).toEqual({ value: '' });
    });

    it('should be able to update value', () => {
      component.body.set({ value: 'new value' });
      expect(component.body()).toEqual({ value: 'new value' });
    });
  });

  describe('showMaxReachedMessage signal', () => {
    it('should have initial value', () => {
      expect(component.showMaxReachedMessage()).toBe(false);
    });

    it('should be able to update value', () => {
      component.showMaxReachedMessage.set(true);
      expect(component.showMaxReachedMessage()).toBe(true);
    });
  });

  describe('onPaste method', () => {
    it('should call textareaValidationService.handlePasteText', () => {
      const mockEvent = { type: 'paste' } as any;

      component.onPaste(mockEvent);

      expect(mockTextareaValidationService.handlePasteText).toHaveBeenCalledWith(
        mockEvent,
        component.signal,
        component.optionValue,
        component.body,
        component.showMaxReachedMessage
      );
    });
  });

  describe('shouldPreventInput method', () => {
    it('should call textareaValidationService.shouldPreventInput', () => {
      const mockEvent = new KeyboardEvent('keydown');
      const currentValue = 'test value';

      component.shouldPreventInput(mockEvent, currentValue);

      expect(mockTextareaValidationService.shouldPreventInput).toHaveBeenCalledWith(mockEvent, currentValue);
    });
  });

  describe('shouldPreventTextInput method', () => {
    it('should call textareaValidationService.shouldPreventTextInput', () => {
      const mockEvent = new KeyboardEvent('keydown');

      component.shouldPreventTextInput(mockEvent);

      expect(mockTextareaValidationService.shouldPreventTextInput).toHaveBeenCalledWith(mockEvent, component.showMaxReachedMessage);
    });
  });

  describe('value getter', () => {
    it('should return empty string when nested property is undefined', () => {
      mockUtilsService.getNestedPropertySignal.mockReturnValue(undefined);

      expect(component.value).toBe('');
    });

    it('should return empty string when nested property is null', () => {
      mockUtilsService.getNestedPropertySignal.mockReturnValue(null);

      expect(component.value).toBe('');
    });

    it('should return string value when nested property is string', () => {
      mockUtilsService.getNestedPropertySignal.mockReturnValue('test value');

      expect(component.value).toBe('test value');
    });

    it('should return string representation when nested property is number', () => {
      mockUtilsService.getNestedPropertySignal.mockReturnValue(123);

      expect(component.value).toBe('123');
    });

    it('should return string representation when nested property is boolean', () => {
      mockUtilsService.getNestedPropertySignal.mockReturnValue(true);

      expect(component.value).toBe('true');
    });
  });

  describe('setValue method', () => {
    it('should handle empty string', () => {
      component.setValue('');
      expect(component.showMaxReachedMessage()).toBe(false);
      expect(mockUtilsService.setNestedPropertyWithReduceSignal).toHaveBeenCalledWith(component.signal, component.optionValue, '');
    });

    it('should handle short value', () => {
      component.showMaxReachedMessage.set(true);
      component.setValue('test');
      expect(component.showMaxReachedMessage()).toBe(false);
      expect(mockUtilsService.setNestedPropertyWithReduceSignal).toHaveBeenCalledWith(component.signal, component.optionValue, 'test');
    });

    it('should handle long value within maxLength', () => {
      const longValue = 'a'.repeat(30000);
      component.setValue(longValue);
      expect(component.showMaxReachedMessage()).toBe(false);
      expect(mockUtilsService.setNestedPropertyWithReduceSignal).toHaveBeenCalledWith(component.signal, component.optionValue, longValue);
    });

    it('should handle value at maxLength', () => {
      const maxValue = 'a'.repeat(40000);
      component.setValue(maxValue);
      expect(component.showMaxReachedMessage()).toBe(false);
      expect(mockUtilsService.setNestedPropertyWithReduceSignal).toHaveBeenCalledWith(component.signal, component.optionValue, maxValue);
    });

    it('should handle value exceeding maxLength', () => {
      const tooLongValue = 'a'.repeat(50000);
      component.setValue(tooLongValue);
      expect(component.showMaxReachedMessage()).toBe(false);
      expect(mockUtilsService.setNestedPropertyWithReduceSignal).toHaveBeenCalledWith(component.signal, component.optionValue, tooLongValue);
    });
  });

  describe('isInvalid computed', () => {
    it('should return false when not required', () => {
      component.isRequired = false;
      expect(component.isInvalid()).toBe(false);
    });

    it('should return true when required and nested property is undefined', () => {
      component.isRequired = true;
      mockUtilsService.getNestedPropertySignal.mockReturnValue(undefined);
      expect(component.isInvalid()).toBe(true);
    });

    it('should return true when required and nested property is null', () => {
      component.isRequired = true;
      mockUtilsService.getNestedPropertySignal.mockReturnValue(null);
      expect(component.isInvalid()).toBe(true);
    });

    it('should return true when required and nested property is empty string', () => {
      component.isRequired = true;
      mockUtilsService.getNestedPropertySignal.mockReturnValue('');
      expect(component.isInvalid()).toBe(true);
    });

    it('should return false when required and nested property has value', () => {
      component.isRequired = true;
      mockUtilsService.getNestedPropertySignal.mockReturnValue('test value');
      expect(component.isInvalid()).toBe(false);
    });

    it('should return false when required and nested property is number', () => {
      component.isRequired = true;
      mockUtilsService.getNestedPropertySignal.mockReturnValue(123);
      expect(component.isInvalid()).toBe(false);
    });

    it('should return false when required and nested property is boolean', () => {
      component.isRequired = true;
      mockUtilsService.getNestedPropertySignal.mockReturnValue(true);
      expect(component.isInvalid()).toBe(false);
    });
  });

  describe('value setter', () => {
    it('should delegate to setValue method (covers line 66)', () => {
      const setValueSpy = jest.spyOn(component, 'setValue');
      component.value = 'test value';
      expect(setValueSpy).toHaveBeenCalledWith('test value');
    });
  });
});
