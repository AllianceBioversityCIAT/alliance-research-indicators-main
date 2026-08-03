import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActorItemComponent } from './actor-item.component';
import { Actor, GetInnovationDetails } from '@shared/interfaces/get-innovation-details.interface';
import { SubmissionService } from '@shared/services/submission.service';
import { GetActorTypesService } from '@shared/services/control-list/get-actor-types.service';
import { signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { NgTemplateOutlet } from '@angular/common';

describe('ActorItemComponent', () => {
  let component: ActorItemComponent;
  let fixture: ComponentFixture<ActorItemComponent>;
  let submissionServiceMock: Partial<SubmissionService>;
  let actorServiceMock: Partial<GetActorTypesService>;

  beforeEach(async () => {
    submissionServiceMock = { isEditableStatus: jest.fn(() => true) };
    actorServiceMock = { list: jest.fn(() => []) };
    await TestBed.configureTestingModule({
      imports: [ActorItemComponent, CheckboxModule, NgTemplateOutlet, FormsModule, InputTextModule, TextareaModule, SelectModule],
      providers: [
        { provide: SubmissionService, useValue: submissionServiceMock },
        { provide: GetActorTypesService, useValue: actorServiceMock }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ActorItemComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit deleteActorEvent when deleteActor is called', () => {
    jest.spyOn(component.deleteActorEvent, 'emit');
    component.deleteActor();
    expect(component.deleteActorEvent.emit).toHaveBeenCalled();
  });

  it('should set body from actor on ngOnInit', () => {
    const actor = new Actor();
    actor.actor_type_id = 2;
    component.actor = actor;
    component.ngOnInit();
    expect(component.body().actor_type_id).toBe(2);
  });

  it('actorMissing should return true if actor_type_id is missing', () => {
    component.body.set(new Actor());
    expect(component.actorMissing).toBe(true);
  });

  it('actorMissing should return false if actor_type_id is present', () => {
    const actor = new Actor();
    actor.actor_type_id = 1;
    component.body.set(actor);
    expect(component.actorMissing).toBe(false);
  });

  it('actorMissing should return true if body is undefined', () => {
    const originalBody = component.body;
    component.body = (() => undefined) as any;
    expect(component.actorMissing).toBe(true);
    component.body = originalBody;
  });

  it('otherMissing should return true if actor_type_custom_name is missing', () => {
    component.body.set(new Actor());
    expect(component.otherMissing).toBe(true);
  });

  it('otherMissing should return false if actor_type_custom_name is present', () => {
    const actor = new Actor();
    actor.actor_type_custom_name = 'Other';
    component.body.set(actor);
    expect(component.otherMissing).toBe(false);
  });

  it('otherMissing should return true if body is undefined', () => {
    const originalBody = component.body;
    component.body = (() => undefined) as any;
    expect(component.otherMissing).toBe(true);
    component.body = originalBody;
  });

  it('should update parent signal when calling onCheckboxChange', () => {
    const bodySignal: WritableSignal<GetInnovationDetails> = signal({ actors: [new Actor()] } as GetInnovationDetails);
    component.index = 0;
    component.bodySignal = bodySignal;
    const actor = new Actor();
    actor.actor_type_id = 7;
    component.body.set(actor);
    component.onCheckboxChange();
    expect(bodySignal().actors?.[0].actor_type_id).toBe(7);
  });

  it('onDisaggregationChange should update body and sync to parent', () => {
    const bodySignal: WritableSignal<GetInnovationDetails> = signal({ actors: [new Actor()] } as GetInnovationDetails);
    component.index = 0;
    component.bodySignal = bodySignal;
    component.body.set({ ...new Actor(), women_youth: true, women_not_youth: true, men_youth: true, men_not_youth: true });
    component.onDisaggregationChange({ checked: true });
    expect(component.body().women_youth).toBe(false);
    expect(component.body().women_not_youth).toBe(false);
    expect(component.body().men_youth).toBe(false);
    expect(component.body().men_not_youth).toBe(false);
    expect(bodySignal().actors?.[0].women_youth).toBe(false);
  });

  it('onDisaggregationChange should only sync to parent if not checked', () => {
    const bodySignal: WritableSignal<GetInnovationDetails> = signal({ actors: [new Actor()] } as GetInnovationDetails);
    component.index = 0;
    component.bodySignal = bodySignal;
    component.onDisaggregationChange({ checked: false });
    expect(bodySignal().actors?.[0]).toBeDefined();
  });

  it('onDisaggregationChange should not throw if event.checked is undefined', () => {
    component.index = 0;
    component.bodySignal = signal({ actors: [new Actor()] } as GetInnovationDetails);
    expect(() => component.onDisaggregationChange({} as any)).not.toThrow();
  });

  it('onActorTypeChange should update actor_type_id and clear custom name if not 5', () => {
    const bodySignal: WritableSignal<GetInnovationDetails> = signal({ actors: [new Actor()] } as GetInnovationDetails);
    component.index = 0;
    component.bodySignal = bodySignal;
    component.body.set({ ...new Actor(), actor_type_id: 1, actor_type_custom_name: 'Other' });
    component.onActorTypeChange(2);
    expect(component.body().actor_type_id).toBe(2);
    expect(component.body().actor_type_custom_name).toBeUndefined();
    expect(bodySignal().actors?.[0].actor_type_id).toBe(2);
  });

  it('onActorTypeChange should do nothing if event is 5', () => {
    component.body.set({ ...new Actor(), actor_type_id: 1, actor_type_custom_name: 'Other' });
    component.onActorTypeChange(5);
    expect(component.body().actor_type_id).toBe(1);
    expect(component.body().actor_type_custom_name).toBe('Other');
  });

  it('onActorTypeChange should not throw if event is undefined', () => {
    component.index = 0;
    component.bodySignal = signal({ actors: [new Actor()] } as GetInnovationDetails);
    expect(() => component.onActorTypeChange(undefined as any)).not.toThrow();
  });

  it('should update body from actor input when changed', () => {
    const actor = new Actor();
    actor.actor_type_id = 10;
    component.actor = actor;
    component.ngOnInit();
    expect(component.body().actor_type_id).toBe(10);
  });

  it('syncActorToParent should do nothing if index is null', () => {
    const bodySignal: WritableSignal<GetInnovationDetails> = signal({ actors: [new Actor()] } as GetInnovationDetails);
    component.index = null;
    component.bodySignal = bodySignal;
    const before = JSON.stringify(bodySignal());
    // @ts-expect-error: testing private method
    component.syncActorToParent();
    expect(JSON.stringify(bodySignal())).toBe(before);
  });

  it('onDisaggregationChange should not throw if index is null', () => {
    component.index = null;
    component.bodySignal = signal({ actors: [new Actor()] } as GetInnovationDetails);
    expect(() => component.onDisaggregationChange({ checked: true })).not.toThrow();
  });

  it('onActorTypeChange should not throw if index is null', () => {
    component.index = null;
    component.bodySignal = signal({ actors: [new Actor()] } as GetInnovationDetails);
    component.body.set({ ...new Actor(), actor_type_id: 1, actor_type_custom_name: 'Other' });
    expect(() => component.onActorTypeChange(2)).not.toThrow();
  });

  it('onActorTypeChange should do nothing if event is 5', () => {
    const bodySignal: WritableSignal<GetInnovationDetails> = signal({ actors: [new Actor()] } as GetInnovationDetails);
    component.index = 0;
    component.bodySignal = bodySignal;
    const actor = { ...new Actor(), actor_type_id: 1, actor_type_custom_name: 'Other' };
    component.body.set(actor);
    const spy = jest.spyOn<any, any>(component as any, 'syncActorToParent');
    component.onActorTypeChange(5);
    expect(component.body()).toEqual(actor);
    expect(spy).not.toHaveBeenCalled();
  });

  it('onDisaggregationChange should only call syncActorToParent if checked is false', () => {
    const bodySignal: WritableSignal<GetInnovationDetails> = signal({ actors: [new Actor()] } as GetInnovationDetails);
    component.index = 0;
    component.bodySignal = bodySignal;
    const spy = jest.spyOn<any, any>(component as any, 'syncActorToParent');
    component.onDisaggregationChange({ checked: false });
    expect(spy).toHaveBeenCalled();
  });

  it('syncActorToParent should handle when actors array does not exist', () => {
    const bodySignal: WritableSignal<GetInnovationDetails> = signal({} as GetInnovationDetails);
    component.index = 0;
    component.bodySignal = bodySignal;
    component.body.set({ ...new Actor(), actor_type_id: 1 });
    // @ts-expect-error: testing private method
    component.syncActorToParent();
    expect(bodySignal().actors).toBeDefined();
    expect(bodySignal().actors!.length).toBeGreaterThan(0);
  });

  it('syncActorToParent should handle when actors array is shorter than index', () => {
    const bodySignal: WritableSignal<GetInnovationDetails> = signal({ actors: [new Actor()] } as GetInnovationDetails);
    component.index = 2;
    component.bodySignal = bodySignal;
    component.body.set({ ...new Actor(), actor_type_id: 1 });
    // @ts-expect-error: testing private method
    component.syncActorToParent();
    expect(bodySignal().actors!.length).toBeGreaterThan(2);
  });

  it('syncActorToParent should handle when actors array is long enough', () => {
    const bodySignal: WritableSignal<GetInnovationDetails> = signal({
      actors: [new Actor(), new Actor(), new Actor()]
    } as GetInnovationDetails);
    component.index = 1;
    component.bodySignal = bodySignal;
    const actor = { ...new Actor(), actor_type_id: 1 };
    component.body.set(actor);
    // @ts-expect-error: testing private method
    component.syncActorToParent();
    expect(bodySignal().actors![1]).toEqual(actor);
  });

  it('syncBody effect should handle when index is not null but parentActor does not exist', () => {
    const bodySignal: WritableSignal<GetInnovationDetails> = signal({ actors: [] } as unknown as GetInnovationDetails);
    component.index = 0;
    component.bodySignal = bodySignal;
    component.actor = { ...new Actor(), actor_type_id: 1 };
    component.body.set({ ...new Actor(), actor_type_id: 2 });

    component.actor = { ...new Actor(), actor_type_id: 3 };
    component.ngOnInit();

    expect(component.body().actor_type_id).toBe(3);
  });

  it('should handle edge cases in syncActorToParent with different array lengths', () => {
    const bodySignal: WritableSignal<GetInnovationDetails> = signal({
      actors: [new Actor(), new Actor()]
    } as GetInnovationDetails);
    component.index = 1;
    component.bodySignal = bodySignal;
    const actor = { ...new Actor(), actor_type_id: 1 };
    component.body.set(actor);
    // @ts-expect-error: testing private method
    component.syncActorToParent();
    expect(bodySignal().actors![1]).toEqual(actor);
  });

  it('should handle syncActorToParent with empty actors array and index 0', () => {
    const bodySignal: WritableSignal<GetInnovationDetails> = signal({
      actors: []
    } as unknown as GetInnovationDetails);
    component.index = 0;
    component.bodySignal = bodySignal;
    const actor = { ...new Actor(), actor_type_id: 1 };
    component.body.set(actor);
    // @ts-expect-error: testing private method
    component.syncActorToParent();
    expect(bodySignal().actors!.length).toBe(1);
    expect(bodySignal().actors![0]).toEqual(actor);
  });

  it('should handle syncActorToParent with null actors array', () => {
    const bodySignal: WritableSignal<GetInnovationDetails> = signal({
      actors: null
    } as unknown as GetInnovationDetails);
    component.index = 0;
    component.bodySignal = bodySignal;
    const actor = { ...new Actor(), actor_type_id: 1 };
    component.body.set(actor);
    // @ts-expect-error: testing private method
    component.syncActorToParent();
    expect(bodySignal().actors).toBeDefined();
    expect(bodySignal().actors!.length).toBe(1);
  });

  it('should handle syncActorToParent with undefined actors array', () => {
    const bodySignal: WritableSignal<GetInnovationDetails> = signal({
      actors: undefined
    } as unknown as GetInnovationDetails);
    component.index = 0;
    component.bodySignal = bodySignal;
    const actor = { ...new Actor(), actor_type_id: 1 };
    component.body.set(actor);
    // @ts-expect-error: testing private method
    component.syncActorToParent();
    expect(bodySignal().actors).toBeDefined();
    expect(bodySignal().actors!.length).toBe(1);
  });

  it('should emit deleteActorEvent and allow listening', done => {
    component.deleteActorEvent.subscribe(() => {
      done();
    });
    component.deleteActor();
  });

  it('syncBody effect should set body from parentActor when parentActor exists and differs from body', () => {
    const parentActor = { ...new Actor(), actor_type_id: 99 };
    component.index = 0;
    component.actor = { ...parentActor };
    component.body.set({ ...new Actor(), actor_type_id: 1 });
    component.bodySignal.update(prev => ({ ...prev, actors: [parentActor] }));
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(component.body().actor_type_id).toBe(99);
  });

  it('syncBody effect should set body from actor input when parentActor missing and actor differs from body', () => {
    component.index = 0;
    component.bodySignal.update(_ => ({ ...new GetInnovationDetails(), actors: [] }));
    component.actor = { ...new Actor(), actor_type_id: 5 };
    component.body.set(new Actor());
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(component.body().actor_type_id).toBe(5);
  });

  it('syncBodyFromParentOrInput should set body from parentActor when parent differs from body', () => {
    const parentActor = { ...new Actor(), actor_type_id: 99 };
    component.index = 0;
    component.bodySignal.update(prev => ({ ...prev, actors: [parentActor] }));
    component.body.set({ ...new Actor(), actor_type_id: 1 });
    component.syncBodyFromParentOrInput();
    expect(component.body().actor_type_id).toBe(99);
  });

  it('syncBodyFromParentOrInput should set body from actor when parent missing and actor differs from body', () => {
    component.index = 0;
    component.bodySignal.update(_ => ({ ...new GetInnovationDetails(), actors: [] }));
    component.actor = { ...new Actor(), actor_type_id: 5 };
    component.body.set(new Actor());
    component.syncBodyFromParentOrInput();
    expect(component.body().actor_type_id).toBe(5);
  });

  it('syncBodyFromParentOrInput should no-op when index is null', () => {
    component.index = null;
    component.body.set({ ...new Actor(), actor_type_id: 1 });
    component.syncBodyFromParentOrInput();
    expect(component.body().actor_type_id).toBe(1);
  });

  it('syncFromParentData should set body from parentActor when present', () => {
    const parentActor = { ...new Actor(), actor_type_id: 42 };
    component.index = 0;
    component.bodySignal.update(prev => ({ ...prev, actors: [parentActor] }));
    component.body.set(new Actor());
    component.syncFromParentData();
    expect(component.body().actor_type_id).toBe(42);
  });

  it('syncFromParentData should no-op when index is null or parentActor missing', () => {
    component.index = null;
    component.syncFromParentData();
    component.index = 0;
    component.bodySignal.update(_ => ({ ...new GetInnovationDetails(), actors: [] }));
    component.body.set({ ...new Actor(), actor_type_id: 1 });
    component.syncFromParentData();
    expect(component.body().actor_type_id).toBe(1);
  });

  it('syncFromParent effect should set body from parentActor when index and parentActor exist', () => {
    const parentActor = { ...new Actor(), actor_type_id: 42 };
    const bodySignal: WritableSignal<GetInnovationDetails> = signal({
      actors: [new Actor(), parentActor]
    } as GetInnovationDetails);
    component.index = 1;
    component.bodySignal = bodySignal;
    component.actor = { ...parentActor };
    component.body.set(new Actor());
    fixture.detectChanges();
    bodySignal.update(prev => ({ ...prev }));
    fixture.detectChanges();
    expect(component.body().actor_type_id).toBe(42);
  });
});
