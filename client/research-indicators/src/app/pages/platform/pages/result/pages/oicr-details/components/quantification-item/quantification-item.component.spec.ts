import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { QuantificationItemComponent, QuantificationItemData } from './quantification-item.component';
import { SubmissionService } from '@shared/services/submission.service';
import { SimpleChange } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';

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

