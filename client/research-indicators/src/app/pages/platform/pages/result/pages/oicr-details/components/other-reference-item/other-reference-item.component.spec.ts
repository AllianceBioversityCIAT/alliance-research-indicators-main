import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SubmissionService } from '@shared/services/submission.service';

import { OtherReferenceItemComponent, OtherReferenceItemData } from './other-reference-item.component';

describe('OtherReferenceItemComponent', () => {
  let component: OtherReferenceItemComponent;
  let fixture: ComponentFixture<OtherReferenceItemComponent>;
  let submissionService: jest.Mocked<SubmissionService>;

  beforeEach(async () => {
    const mockSubmissionService: jest.Mocked<SubmissionService> = {
      isEditableStatus: jest.fn().mockReturnValue(true)
      // @ts-expect-error partial mock
    } as jest.Mocked<SubmissionService>;

    // Evitamos cargar el template completo (y los componentes hijos) para centrarnos en la lógica TS
    TestBed.overrideComponent(OtherReferenceItemComponent, { set: { template: '' } });

    await TestBed.configureTestingModule({
      imports: [OtherReferenceItemComponent],
      providers: [{ provide: SubmissionService, useValue: mockSubmissionService }]
    }).compileComponents();

    fixture = TestBed.createComponent(OtherReferenceItemComponent);
    component = fixture.componentInstance;
    submissionService = TestBed.inject(SubmissionService) as jest.Mocked<SubmissionService>;
  });

  it('should not emit from effect when not initialized (cover line 31 branch)', () => {
    const emitSpy = jest.spyOn(component.update, 'emit');
    TestBed.flushEffects();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should create', () => {
    component.item = { type_id: 1, link: 'https://example.com' };
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('initialization and changes', () => {
    it('should initialize body from input item on ngOnInit', () => {
      const item: OtherReferenceItemData = { type_id: 2, link: 'https://init.com' };
      component.item = item;

      component.ngOnInit();

      expect(component['initialized']).toBe(true);
      expect(component.body()).toEqual(item);
    });

    it('should fallback to default when item is undefined on ngOnInit', () => {
      // @ts-expect-error force undefined
      component.item = undefined;

      component.ngOnInit();

      expect(component.body()).toEqual({ type_id: null, link: '' });
    });

    it('should update body on ngOnChanges when item changes after init', () => {
      const initial: OtherReferenceItemData = { type_id: 1, link: 'https://one.com' };
      const next: OtherReferenceItemData = { type_id: 2, link: 'https://two.com' };

      component.item = initial;
      component.ngOnInit();

      component.item = next;
      component.ngOnChanges({
        item: {
          currentValue: next,
          previousValue: initial,
          firstChange: false,
          isFirstChange: () => false
        }
      });

      expect(component.body()).toEqual(next);
    });

    it('should not update body on ngOnChanges when value is the same', () => {
      const item: OtherReferenceItemData = { type_id: 1, link: 'https://same.com' };
      component.item = item;
      component.ngOnInit();

      const spy = jest.spyOn(component.body, 'set');

      component.item = { ...item };
      component.ngOnChanges({
        item: {
          currentValue: { ...item },
          previousValue: item,
          firstChange: false,
          isFirstChange: () => false
        }
      });

      expect(spy).not.toHaveBeenCalled();
    });

    it('should ignore ngOnChanges before initialization', () => {
      const item: OtherReferenceItemData = { type_id: 3, link: 'https://pre-init.com' };
      component.item = item;
      const spy = jest.spyOn(component.body, 'set');

      component.ngOnChanges({
        item: {
          currentValue: item,
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true
        }
      });

      expect(spy).not.toHaveBeenCalled();
    });

    it('should not run item update when ngOnChanges has no item key (cover line 40 branch)', () => {
      component.item = { type_id: 1, link: 'https://a.com' };
      component.ngOnInit();
      const setSpy = jest.spyOn(component.body, 'set');

      component.ngOnChanges({});

      expect(setSpy).not.toHaveBeenCalled();
    });

    it('should use default item when ngOnChanges item is undefined (cover line 41 fallback)', () => {
      const initial = { type_id: 1, link: 'https://a.com' };
      component.item = initial;
      component.ngOnInit();
      component.item = undefined as any;
      component.ngOnChanges({
        item: {
          currentValue: undefined,
          previousValue: initial,
          firstChange: false,
          isFirstChange: () => false
        }
      });

      expect(component.body()).toEqual({ type_id: null, link: '' });
    });
  });

  describe('effects and events', () => {
    it('should emit update on link change handler', () => {
      const updateSpy = jest.spyOn(component.update, 'emit');
      component.body.set({ type_id: 1, link: 'https://initial.com' });

      component.onLinkChange();

      expect(updateSpy).toHaveBeenCalledWith({ type_id: 1, link: 'https://initial.com' });
    });

    it('should emit update when body changes after initialization (valueEffect)', fakeAsync(() => {
      component.item = { type_id: 1, link: 'https://one.com' };
      component.ngOnInit();
      const updateSpy = jest.spyOn(component.update, 'emit').mockImplementation(() => {});
      fixture.detectChanges();
      tick();
      updateSpy.mockClear();

      component.body.set({ type_id: 2, link: 'https://two.com' });
      fixture.detectChanges();
      tick();

      expect(updateSpy).toHaveBeenCalledWith({ type_id: 2, link: 'https://two.com' });
    }));
  });

  describe('delete behavior', () => {
    it('should emit delete when editable', () => {
      submissionService.isEditableStatus.mockReturnValue(true);
      const deleteSpy = jest.spyOn(component.delete, 'emit');

      component.onDelete();

      expect(deleteSpy).toHaveBeenCalled();
    });

    it('should not emit delete when not editable', () => {
      submissionService.isEditableStatus.mockReturnValue(false);
      const deleteSpy = jest.spyOn(component.delete, 'emit');

      component.onDelete();

      expect(deleteSpy).not.toHaveBeenCalled();
    });
  });
});


