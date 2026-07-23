import { TestBed } from '@angular/core/testing';
import { DynamicFieldsService } from './dynamic-fields.service';
import { DynamicComponentSelectorService } from './components/dynamic-component-selector/dynamic-component-selector.service';

describe('DynamicFieldsService', () => {
  let service: DynamicFieldsService;
  let dynamicComponentSelectorSE: DynamicComponentSelectorService;

  const mockFields = [
    {
      type: 'input',
      attr: 'name',
      validations: {
        required: true,
        maxLength: 50
      }
    },
    {
      type: 'select',
      attr: 'country',
      validations: {
        required: true
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'input',
          attr: 'age',
          validations: {
            required: true,
            min: 18,
            max: 100
          }
        }
      ]
    },
    {
      type: 'block',
      fields: [
        {
          type: 'input',
          attr: 'email',
          validations: {
            required: true,
            patron: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
          }
        }
      ]
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DynamicFieldsService,
        {
          provide: DynamicComponentSelectorService,
          useValue: { fields: mockFields }
        }
      ]
    });
    service = TestBed.inject(DynamicFieldsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('flattenFields', () => {
    it('should flatten fields array and filter by types', () => {
      const types = ['input', 'select'];
      const result = service.flattenFields(mockFields, types);

      expect(result.length).toBe(4);
      expect(result[0].attr).toBe('name');
      expect(result[1].attr).toBe('country');
      expect(result[2].attr).toBe('age');
      expect(result[3].attr).toBe('email');
    });

    it('should return empty array if no matching types', () => {
      const types = ['checkbox'];
      const result = service.flattenFields(mockFields, types);

      expect(result.length).toBe(0);
    });

    it('should handle empty fields array', () => {
      const types = ['input', 'select'];
      const result = service.flattenFields([], types);
      expect(result).toEqual([]);
    });

    it('should handle fields without inner fields', () => {
      const types = ['input', 'select'];
      const simpleFields = [
        {
          type: 'input',
          attr: 'test',
          validations: {}
        }
      ];
      const result = service.flattenFields(simpleFields, types);
      expect(result.length).toBe(1);
      expect(result[0].attr).toBe('test');
    });

    it('should handle deeply nested fields', () => {
      const types = ['input'];
      const nestedFields = [
        {
          type: 'section',
          fields: [
            {
              type: 'block',
              fields: [
                {
                  type: 'input',
                  attr: 'deep',
                  validations: {}
                }
              ]
            }
          ]
        }
      ];
      const result = service.flattenFields(nestedFields, types);
      expect(result.length).toBe(1);
      expect(result[0].attr).toBe('deep');
    });
  });

  describe('init', () => {
    beforeEach(() => {
      service.init(mockFields);
    });

    it('should create form controls for each field', () => {
      expect(service.formGroup.get('name')).toBeTruthy();
      expect(service.formGroup.get('country')).toBeTruthy();
      expect(service.formGroup.get('age')).toBeTruthy();
      expect(service.formGroup.get('email')).toBeTruthy();
    });

    it('should apply required validator when specified', () => {
      const nameControl = service.formGroup.get('name');
      const validators = nameControl?.validator?.({} as any);
      expect(validators?.['required']).toBeTruthy();
    });

    it('should apply maxLength validator when specified', () => {
      const nameControl = service.formGroup.get('name');
      const control = { value: 'a'.repeat(51) } as any;
      const validators = nameControl?.validator?.(control);
      expect(validators?.['maxlength']).toBeTruthy();
    });

    it('should apply min and max validators when specified', () => {
      const ageControl = service.formGroup.get('age');
      const controlMin = { value: 17 } as any;
      const controlMax = { value: 101 } as any;
      const validatorsMin = ageControl?.validator?.(controlMin);
      const validatorsMax = ageControl?.validator?.(controlMax);
      expect(validatorsMin?.['min']).toBeTruthy();
      expect(validatorsMax?.['max']).toBeTruthy();
    });

    it('should apply pattern validator when specified', () => {
      const emailControl = service.formGroup.get('email');
      const control = { value: 'invalid-email' } as any;
      const validators = emailControl?.validator?.(control);
      expect(validators?.['pattern']).toBeTruthy();
    });

    it('should initialize with empty string values', () => {
      expect(service.formGroup.get('name')?.value).toBe('');
      expect(service.formGroup.get('country')?.value).toBe('');
      expect(service.formGroup.get('age')?.value).toBe('');
      expect(service.formGroup.get('email')?.value).toBe('');
    });

    it('should handle fields without validations', () => {
      const fieldsWithoutValidations = [
        {
          type: 'input',
          attr: 'noValidations',
          validations: {}
        }
      ];
      service.init(fieldsWithoutValidations);
      const control = service.formGroup.get('noValidations');
      expect(control).toBeNull();
    });

    it('should handle fields with empty validations object', () => {
      const fieldsWithEmptyValidations = [
        {
          type: 'input',
          attr: 'emptyValidations',
          validations: {}
        }
      ];
      service.init(fieldsWithEmptyValidations);
      const control = service.formGroup.get('emptyValidations');
      expect(control).toBeNull();
    });

    it('should handle fields with undefined validations', () => {
      const fieldsWithUndefinedValidations = [
        {
          type: 'input',
          attr: 'undefinedValidations'
        }
      ];
      service.init(fieldsWithUndefinedValidations);
      const control = service.formGroup.get('undefinedValidations');
      if (control) {
        expect(control.value).toBe('');
      }
    });
  });
});
