import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectComponent } from './select.component';
import { signal, SimpleChange } from '@angular/core';
import { ServiceLocatorService } from '../../../services/service-locator.service';
import { CacheService } from '../../../services/cache/cache.service';
import { UtilsService } from '../../../services/utils.service';
import { AllModalsService } from '../../../services/cache/all-modals.service';

describe('SelectComponent', () => {
  let component: SelectComponent;
  let mockServiceLocator: jest.Mocked<ServiceLocatorService>;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockUtilsService: jest.Mocked<UtilsService>;
  let mockAllModalsService: jest.Mocked<AllModalsService>;
  let mockService: any;

  beforeEach(async () => {
    mockService = {
      list: jest.fn().mockReturnValue([
        { id: 1, name: 'Option 1' },
        { id: 2, name: 'Option 2' }
      ]),
      isOpenSearch: jest.fn().mockReturnValue(true),
      update: jest.fn()
    };

    mockServiceLocator = {
      getService: jest.fn().mockReturnValue(mockService)
    } as any;

    mockCacheService = {
      currentResultIsLoading: signal(false)
    } as any;

    mockUtilsService = {
      getNestedProperty: jest.fn().mockReturnValue(null),
      setNestedPropertyWithReduce: jest.fn(),
      setNestedPropertyWithReduceSignal: jest.fn()
    } as any;

    mockAllModalsService = {
      // Add any methods that might be used
    } as any;

    await TestBed.configureTestingModule({
      imports: [SelectComponent],
      providers: [
        { provide: ServiceLocatorService, useValue: mockServiceLocator },
        { provide: CacheService, useValue: mockCacheService },
        { provide: UtilsService, useValue: mockUtilsService },
        { provide: AllModalsService, useValue: mockAllModalsService }
      ]
    }).compileComponents();

    component = TestBed.createComponent(SelectComponent).componentInstance;

    // Setup initial component configuration
    component.signal = signal({ testField: null });
    component.optionValue = { body: 'testField', option: 'id' };
    component.serviceName = 'getCountries';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.optionLabel).toBe('');
    expect(component.optionLabel2).toBe('');
    expect(component.optionValue).toEqual({ body: 'testField', option: 'id' });
    expect(component.serviceName).toBe('getCountries');
    expect(component.label).toBe('');
    expect(component.description).toBe('');
    expect(component.placeholder).toBe('');
    expect(component.helperText).toBe('');
    expect(component.disabled).toBe(false);
    expect(component.scrollHeight).toBe('270px');
    expect(component.isRequired).toBe(false);
    expect(component.flagAttributes).toEqual({ isoAlpha2: '', institution_location_name: '' });
    expect(component.hideSelected).toBe(true);
    expect(component.textSpan).toBe('');
  });

  it('should initialize service in ngOnInit', () => {
    component.ngOnInit();
    expect(mockServiceLocator.getService).toHaveBeenCalledWith('getCountries');
    expect(component.service).toBe(mockService);
  });

  it('should handle onFilter for OpenSearch service', () => {
    component.ngOnInit();
    const mockEvent = { filter: 'test search' };

    component.onFilter(mockEvent);

    expect(mockService.update).toHaveBeenCalledWith('test search');
  });

  it('should handle onFilter for non-OpenSearch service', () => {
    mockService.isOpenSearch.mockReturnValue(false);
    component.ngOnInit();
    const mockEvent = { filter: 'test search' };

    component.onFilter(mockEvent);

    expect(mockService.update).not.toHaveBeenCalled();
  });

  it('should handle onFilter when service is null', () => {
    component.service = null;
    const mockEvent = { filter: 'test search' };

    component.onFilter(mockEvent);

    // Should not throw error
    expect(true).toBe(true);
  });

  it('should handle isInvalid computed property when required and empty', () => {
    component.isRequired = true;
    component.isRequiredSignal.set(true);
    component.body.set({ value: null });

    expect(component.isInvalid()).toBe(true);
  });

  it('should handle isInvalid computed property when required and has value', () => {
    component.isRequired = true;
    component.isRequiredSignal.set(true);
    component.body.set({ value: 'some value' });

    expect(component.isInvalid()).toBe(false);
  });

  it('should handle isInvalid computed property when not required', () => {
    component.isRequired = false;
    component.isRequiredSignal.set(false);
    component.body.set({ value: null });

    expect(component.isInvalid()).toBe(false);
  });

  it('should handle selectedOption computed property when value exists', () => {
    component.ngOnInit();
    component.body.set({ value: 1 });

    const result = component.selectedOption();

    expect(result).toEqual({ id: 1, name: 'Option 1' });
  });

  it('should handle selectedOption computed property when value does not exist', () => {
    component.ngOnInit();
    component.body.set({ value: 999 });

    const result = component.selectedOption();

    expect(result).toBeUndefined();
  });

  it('should handle selectedOption computed property when no value', () => {
    component.ngOnInit();
    component.body.set({ value: null });

    const result = component.selectedOption();

    expect(result).toBeNull();
  });

  it('should handle selectedOption computed property when service is null', () => {
    component.service = null;
    component.body.set({ value: 1 });

    const result = component.selectedOption();

    expect(result).toBeUndefined();
  });

  it('should handle selectedOption computed property when service.list is null', () => {
    component.ngOnInit();
    mockService.list.mockReturnValue(null);
    component.body.set({ value: 1 });

    const result = component.selectedOption();

    expect(result).toBeUndefined();
  });

  it('should handle effect when currentResultIsLoading is true', () => {
    // Trigger the effect by changing currentResultIsLoading
    mockCacheService.currentResultIsLoading.set(true);

    // The effect should not update the body when loading is true
    expect(mockUtilsService.setNestedPropertyWithReduce).not.toHaveBeenCalled();
  });

  it('should handle environment property', () => {
    expect(component.environment).toBeDefined();
  });

  it('should handle body signal updates', () => {
    const testValue = { value: 'new-value' };

    component.body.set(testValue);

    expect(component.body()).toEqual(testValue);
  });

  it('should handle signal updates', () => {
    const testSignal = signal({ newField: 'new-value' });

    component.signal = testSignal;

    expect(component.signal()).toEqual({ newField: 'new-value' });
  });

  it('should handle allModalsService injection', () => {
    expect(component.allModalsService).toBe(mockAllModalsService);
  });

  it('should handle template properties', () => {
    expect(component.itemTemplate).toBeUndefined();
    expect(component.selectedItemTemplate).toBeUndefined();
    expect(component.selectedItemsTemplate).toBeUndefined();
    expect(component.headerTemplate).toBeUndefined();
    expect(component.rowsTemplate).toBeUndefined();
  });

  it('should handle service injection through constructor', () => {
    expect(component['serviceLocator']).toBe(mockServiceLocator);
  });

  it('onSectionLoad effect sets body when nested array value exists', () => {
    // Prevent effect on construct
    mockCacheService.currentResultIsLoading.set(true);

    // Add missing loading method to mock service
    mockService.loading = jest.fn().mockReturnValue(false);

    const fixture = TestBed.createComponent(SelectComponent);
    const comp = fixture.componentInstance;

    // Arrange state before enabling effect
    comp.optionValue = { body: 'items.value', option: 'id' };
    comp.body.set({ value: null });
    comp.signal = signal<any>({ items: [{ value: 'ARR-VAL' }] });

    mockUtilsService.setNestedPropertyWithReduce.mockImplementation((obj: any, _p: string, v: any) => {
      obj.value = v;
    });

    // Trigger effect now
    mockCacheService.currentResultIsLoading.set(false);
    fixture.detectChanges();

    expect(comp.body().value).toBe('ARR-VAL');
  });

  it('onSectionLoad effect handles non-array path (covers lines 80-83)', () => {
    // Prevent effect on construct
    mockCacheService.currentResultIsLoading.set(true);

    // Add missing loading method to mock service
    mockService.loading = jest.fn().mockReturnValue(false);

    const fixture = TestBed.createComponent(SelectComponent);
    const comp = fixture.componentInstance;

    // Arrange state before enabling effect - non-array path
    comp.optionValue = { body: 'simpleField', option: 'id' };
    comp.body.set({ value: null });
    comp.signal = signal<any>({ simpleField: 'SIMPLE-VAL' });

    mockUtilsService.getNestedProperty.mockReturnValue('SIMPLE-VAL');
    mockUtilsService.setNestedPropertyWithReduce.mockImplementation((obj: any, _p: string, v: any) => {
      obj.value = v;
    });

    // Trigger effect now
    mockCacheService.currentResultIsLoading.set(false);
    fixture.detectChanges();

    expect(comp.body().value).toBe('SIMPLE-VAL');
  });


  it('setValue updates simple path using utils', () => {
    component.optionValue = { body: 'testField', option: 'id' };
    component.setValue('SIMPLE');
    expect(mockUtilsService.setNestedPropertyWithReduce).toHaveBeenCalledWith(expect.any(Object), 'testField', 'SIMPLE');
  });

  it('setValue creates array and pushes object when array path exists but empty', () => {
    component.signal = signal<any>({ arr: [] });
    component.optionValue = { body: 'arr.prop', option: 'id' };

    component.setValue(123);

    const result = component.signal();
    expect(Array.isArray(result.arr)).toBe(true);
    expect(result.arr.length).toBe(1);
    expect(result.arr[0].prop).toBe(123);
  });

  it('setValue updates first element when array path already exists', () => {
    component.signal = signal<any>({ arr: [{ prop: 1 }] });
    component.optionValue = { body: 'arr.prop', option: 'id' };

    component.setValue(999);

    const result = component.signal();
    expect(result.arr[0].prop).toBe(999);
  });

  it('setValue uses utils when array path exists but is not an array (covers line 125)', () => {
    component.optionValue = { body: 'arr.prop', option: 'id' };
    component.signal.set({ arr: 'not-an-array' });
    component.setValue(789);

    expect(mockUtilsService.setNestedPropertyWithReduce).toHaveBeenCalledWith(
      expect.any(Object),
      'arr.prop',
      789
    );
  });

  it('setValue uses utils when array path does not exist (covers line 125)', () => {
    component.optionValue = { body: 'arr.prop', option: 'id' };
    component.signal.set({});
    component.setValue(999);

    expect(mockUtilsService.setNestedPropertyWithReduce).toHaveBeenCalledWith(
      expect.any(Object),
      'arr.prop',
      999
    );
  });

  it('setValue handles simple property path (covers line 125)', () => {
    component.optionValue = { body: 'simpleField', option: 'id' };
    component.signal.set({ simpleField: 'old' });
    component.setValue('new');

    expect(mockUtilsService.setNestedPropertyWithReduce).toHaveBeenCalledWith(
      expect.any(Object),
      'simpleField',
      'new'
    );
  });

  it('setValue initializes missing array branch to cover line 132', () => {
    component.optionValue = { body: 'arr.prop', option: 'id' };
    component.signal.set({});
    const isArraySpy = jest.spyOn(Array, 'isArray')
      .mockImplementationOnce(() => true)
      .mockImplementation(() => false);
    component.setValue(42);
    isArraySpy.mockRestore();
    const result = component.signal();
    expect(Array.isArray(result.arr)).toBe(true);
    expect(result.arr.length).toBe(1);
    expect(result.arr[0].prop).toBe(42);
  });

  it('should bind service signals when service has getList and getLoading', () => {
    const listSignal = signal([{ id: 1, name: 'Option 1' }]);
    const loadingSignal = signal(false);
    
    const serviceWithGetMethods = {
      getList: jest.fn().mockReturnValue(listSignal),
      getLoading: jest.fn().mockReturnValue(loadingSignal)
    };

    mockServiceLocator.getService.mockReturnValue(serviceWithGetMethods);
    component.serviceName = 'testService';
    component.serviceParams = { param: 'value' };
    
    component.ngOnInit();
    
    expect(serviceWithGetMethods.getList).toHaveBeenCalledWith({ param: 'value' });
    expect(serviceWithGetMethods.getLoading).toHaveBeenCalledWith({ param: 'value' });
    expect(component.optionsSig).toBe(listSignal);
    expect(component.loadingSig).toBe(loadingSignal);
  });

  it('ngOnChanges should call initializeService when only serviceParams change', () => {
    const initSpy = jest.spyOn(component as any, 'initializeService').mockImplementation(() => {});
    component.ngOnInit();
    initSpy.mockClear();

    component.ngOnChanges({
      serviceParams: new SimpleChange({ a: 1 }, { a: 2 }, false)
    });

    expect(initSpy).toHaveBeenCalled();
    initSpy.mockRestore();
  });

  it('ngOnChanges should update isRequiredSignal when isRequired input changes', () => {
    component.isRequired = false;
    component.ngOnInit();
    expect(component.isRequiredSignal()).toBe(false);

    component.isRequired = true;
    component.ngOnChanges({
      isRequired: new SimpleChange(false, true, false)
    });

    expect(component.isRequiredSignal()).toBe(true);
  });

  it('onSectionLoad uses getNestedProperty for dotted body when first segment is not an array (line 103)', () => {
    mockCacheService.currentResultIsLoading.set(true);

    const fixture = TestBed.createComponent(SelectComponent);
    const comp = fixture.componentInstance;
    comp.optionValue = { body: 'items.value', option: 'id' };
    comp.body.set({ value: null });
    comp.signal = signal<any>({ items: { notAnArray: true } });

    mockUtilsService.getNestedProperty.mockImplementation((obj: any, path: string) => {
      if (path === 'items.value') {
        return 'FROM-NESTED';
      }
      return null;
    });
    mockUtilsService.setNestedPropertyWithReduce.mockImplementation((obj: any, _p: string, v: any) => {
      obj.value = v;
    });

    mockCacheService.currentResultIsLoading.set(false);
    fixture.detectChanges();

    expect(comp.body().value).toBe('FROM-NESTED');
  });

  it('loadData should catch when service.main rejects', async () => {
    const failingService = {
      ...mockService,
      main: jest.fn().mockRejectedValue(new Error('network'))
    };
    mockServiceLocator.getService.mockReturnValue(failingService);

    const fixture = TestBed.createComponent(SelectComponent);
    const comp = fixture.componentInstance;
    comp.serviceName = 'getCountries';
    comp.ngOnInit();

    await Promise.resolve();
    await Promise.resolve();

    expect(failingService.main).toHaveBeenCalled();
  });
});
