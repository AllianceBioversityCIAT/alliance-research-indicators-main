// @akili-spec docs/specs/innovation-use/details-page (T-05 — innovation use actor card)
import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { InnovationUseActorItemComponent } from './innovation-use-actor-item.component';
import { InnovationUseActor } from '@shared/interfaces/get-innovation-use-details.interface';
import { GetActorTypesService } from '@shared/services/control-list/get-actor-types.service';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { Checkbox } from 'primeng/checkbox';
import { ActorType } from '@shared/interfaces/get-actor-types.interface';

const ACTOR_TYPES: ActorType[] = [
  { code: 1, name: 'Farmers', is_active: true, created_at: '', updated_at: '' },
  { code: 2, name: 'NGOs', is_active: true, created_at: '', updated_at: '' },
  { code: 5, name: 'Other', is_active: true, created_at: '', updated_at: '' }
];

describe('InnovationUseActorItemComponent', () => {
  let component: InnovationUseActorItemComponent;
  let fixture: ComponentFixture<InnovationUseActorItemComponent>;

  beforeEach(async () => {
    const mockActorTypesService = { list: signal(ACTOR_TYPES) };

    await TestBed.configureTestingModule({
      imports: [InnovationUseActorItemComponent],
      providers: [{ provide: GetActorTypesService, useValue: mockActorTypesService }]
    }).compileComponents();

    fixture = TestBed.createComponent(InnovationUseActorItemComponent);
    component = fixture.componentInstance;
  });

  const totalText = (): string => (fixture.debugElement.query(By.css('.actor-total')).nativeElement.textContent || '').trim();

  const appInputs = () => fixture.debugElement.queryAll(By.directive(InputComponent));

  const appInputInstances = (): InputComponent[] => appInputs().map(de => de.componentInstance as InputComponent);

  const appInputLabelled = (label: string) => appInputInstances().find(i => i.label === label);

  const inputNumberInside = (de: ReturnType<typeof appInputs>[number]): InputNumber => de.query(By.directive(InputNumber)).componentInstance as InputNumber;

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  // T-11 c2 — discharged as RESOLUTION, not presence: the checkbox's <label for> must resolve
  // to the checkbox's own rendered <input>, not merely exist in the DOM.
  describe('T-11 c2 — the disaggregation-mode checkbox label resolves to its own input', () => {
    it("label.htmlFor resolves to the checkbox's rendered input element", () => {
      component.actor = new InnovationUseActor();
      component.actorNumber = 4;
      fixture.detectChanges();

      const label = fixture.debugElement.query(By.css('label')).nativeElement as HTMLLabelElement;
      const resolved = (fixture.nativeElement as HTMLElement).querySelector(`#${label.htmlFor}`);
      const checkboxInput = fixture.debugElement.query(By.directive(Checkbox)).query(By.css('input')).nativeElement as HTMLInputElement;

      expect(label.htmlFor).toBe('sex_age_disaggregation_not_apply_4');
      expect(resolved).toBe(checkboxInput);
    });
  });

  // Pinning test (rework attempt 2, Lens A issue 1): body() is a shallow-spread copy of the
  // parent's @Input row, never the same object reference — app-input's in-place write
  // (UtilsService.setNestedPropertyWithReduceSignal) must never land on the parent's object.
  describe('body is a local copy of the parent row, not the same object (DD-5)', () => {
    it('a count typed into the card does not mutate the @Input object the parent still holds', () => {
      const row = { ...new InnovationUseActor(), sex_age_disaggregation_not_apply: false };
      component.actor = row;
      fixture.detectChanges();

      appInputLabelled('Women youth')!.setValue(3);
      fixture.detectChanges();

      expect(row.women_youth_count).toBeUndefined();
      expect(component.body().women_youth_count).toBe(3);
    });
  });

  // c1 — Unchecked renders the four disaggregated inputs and no actors_count input; checked
  // renders one How many and none of the four. Exactly one mode is ever in the DOM.
  describe('c1 — exactly one mode in the DOM', () => {
    it('disaggregated mode renders exactly the four counts and no How many', () => {
      component.actor = { ...new InnovationUseActor(), sex_age_disaggregation_not_apply: false };
      fixture.detectChanges();

      expect(appInputs().length).toBe(4);
      expect(appInputLabelled('Women youth')).toBeTruthy();
      expect(appInputLabelled('Women non-youth')).toBeTruthy();
      expect(appInputLabelled('Men youth')).toBeTruthy();
      expect(appInputLabelled('Men non-youth')).toBeTruthy();
      expect(appInputLabelled('How many')).toBeFalsy();
    });

    it('aggregate mode renders exactly one How many and none of the four', () => {
      component.actor = { ...new InnovationUseActor(), sex_age_disaggregation_not_apply: true };
      fixture.detectChanges();

      expect(appInputs().length).toBe(1);
      expect(appInputLabelled('How many')).toBeTruthy();
      expect(appInputLabelled('Women youth')).toBeFalsy();
      expect(appInputLabelled('Women non-youth')).toBeFalsy();
      expect(appInputLabelled('Men youth')).toBeFalsy();
      expect(appInputLabelled('Men non-youth')).toBeFalsy();
    });
  });

  // c2 — Switching modes clears the departing mode's fields in the emitted row.
  describe('c2 — mode switch clears the departing mode', () => {
    it(
      'disaggregated -> aggregate clears the four counts in the emitted row',
      fakeAsync(() => {
        component.actor = {
          ...new InnovationUseActor(),
          sex_age_disaggregation_not_apply: false,
          women_youth_count: 4,
          men_youth_count: 2
        };
        fixture.detectChanges();
        tick();
        flush();
        const emitSpy = jest.spyOn(component.update, 'emit');

        component.onModeChange(true);
        tick();
        flush();
        fixture.detectChanges();

        const emitted = emitSpy.mock.calls.at(-1)?.[0] as InnovationUseActor;
        expect(emitted.sex_age_disaggregation_not_apply).toBe(true);
        expect(emitted.women_youth_count).toBeUndefined();
        expect(emitted.women_not_youth_count).toBeUndefined();
        expect(emitted.men_youth_count).toBeUndefined();
        expect(emitted.men_not_youth_count).toBeUndefined();
      })
    );

    it(
      'aggregate -> disaggregated clears actors_count in the emitted row',
      fakeAsync(() => {
        component.actor = { ...new InnovationUseActor(), sex_age_disaggregation_not_apply: true, actors_count: 9 };
        fixture.detectChanges();
        tick();
        flush();
        const emitSpy = jest.spyOn(component.update, 'emit');

        component.onModeChange(false);
        tick();
        flush();
        fixture.detectChanges();

        const emitted = emitSpy.mock.calls.at(-1)?.[0] as InnovationUseActor;
        expect(emitted.sex_age_disaggregation_not_apply).toBe(false);
        expect(emitted.actors_count).toBeUndefined();
      })
    );
  });

  // c3 — Entering 3 and 2 in two disaggregated fields renders a LIVE total of 5.
  // Disqualifier: asserted on rendered text, never on the computed directly.
  describe('c3 — live total, rendered', () => {
    it('renders 5 after 3 and 2 are entered in two disaggregated fields', () => {
      component.actor = { ...new InnovationUseActor(), sex_age_disaggregation_not_apply: false };
      fixture.detectChanges();

      appInputLabelled('Women youth')!.setValue(3);
      fixture.detectChanges();
      appInputLabelled('Men youth')!.setValue(2);
      fixture.detectChanges();

      expect(totalText()).toBe('5');
    });
  });

  // c4 — All four disaggregated fields empty renders an EMPTY total, not 0.
  // Falsifying input: return 0 instead of null for the all-absent case -> this must FAIL.
  describe('c4 — empty total when all four counts are absent, never 0', () => {
    it('renders an empty total, and the text is not the string "0"', () => {
      component.actor = { ...new InnovationUseActor(), sex_age_disaggregation_not_apply: false };
      fixture.detectChanges();

      expect(totalText()).toBe('');
      expect(totalText()).not.toBe('0');
    });
  });

  // c5 — Aggregate mode's total equals actors_count; a saved aggregate row of 12 renders 12.
  describe('c5 — aggregate total equals actors_count, rendered', () => {
    it('renders 12 for a saved aggregate row of actors_count: 12', () => {
      component.actor = { ...new InnovationUseActor(), sex_age_disaggregation_not_apply: true, actors_count: 12 };
      fixture.detectChanges();

      expect(totalText()).toBe('12');
    });
  });

  // c6 — The total control cannot receive a typed value.
  describe('c6 — total is read-only text, not an input', () => {
    it('renders the total as a span, with no input or p-inputNumber inside its row', () => {
      component.actor = { ...new InnovationUseActor(), sex_age_disaggregation_not_apply: true, actors_count: 12 };
      fixture.detectChanges();

      const totalDe = fixture.debugElement.query(By.css('.actor-total'));
      expect(totalDe.nativeElement.tagName).toBe('SPAN');
      expect(totalDe.query(By.css('input'))).toBeNull();
      expect(totalDe.query(By.directive(InputNumber))).toBeNull();

      const totalRow = fixture.debugElement.query(By.css('.actor-total')).parent!;
      expect(totalRow.query(By.directive(InputNumber))).toBeNull();
    });
  });

  // c7 — Actor type 5 reveals a mandatory Specify other; changing away from 5 clears
  // actor_type_custom_name in the emitted row.
  describe('c7 — OTHER reveals Specify other; leaving OTHER clears the custom name', () => {
    it(
      'shows the Specify other input only when actor_type_id === 5, and clears the name on change away',
      fakeAsync(() => {
        component.actor = new InnovationUseActor();
        fixture.detectChanges();
        tick();
        flush();
        const emitSpy = jest.spyOn(component.update, 'emit');

        expect(fixture.debugElement.query(By.css('input[placeholder="Specify other"]'))).toBeNull();

        component.onActorTypeChange(5);
        fixture.detectChanges();
        expect(fixture.debugElement.query(By.css('input[placeholder="Specify other"]'))).toBeTruthy();

        component.onCustomNameChange('local cooperatives');
        tick();
        flush();
        fixture.detectChanges();
        let emitted = emitSpy.mock.calls.at(-1)?.[0] as InnovationUseActor;
        expect(emitted.actor_type_custom_name).toBe('local cooperatives');

        component.onActorTypeChange(2);
        tick();
        flush();
        fixture.detectChanges();
        emitted = emitSpy.mock.calls.at(-1)?.[0] as InnovationUseActor;
        expect(emitted.actor_type_custom_name).toBeUndefined();
        expect(fixture.debugElement.query(By.css('input[placeholder="Specify other"]'))).toBeNull();
      })
    );
  });

  // c8 — A row with no actor type shows the inline required message and the error border.
  describe('c8 — missing actor type shows the required message and error border', () => {
    it('renders the required message and a red-token border on the select', () => {
      component.actor = new InnovationUseActor();
      component.duplicateType = false;
      fixture.detectChanges();

      expect((fixture.nativeElement.textContent as string)).toContain('This field is required');

      const selectDe = fixture.debugElement.query(By.directive(Select));
      expect(selectDe.nativeElement.className).toContain('border-[var(--ac-red-1)]');

      // T-11 c3 — icon AND text, never text alone. Only the required message renders here
      // (actor_type_id is unset, duplicateType is false), so exactly one warning icon exists.
      const icon = fixture.debugElement.query(By.css('i.material-symbols-rounded'));
      expect(icon).toBeTruthy();
      expect((icon.nativeElement.textContent || '').trim()).toBe('warning');
    });
  });

  // c9 — duplicateType = true renders the duplicate message instead of the generic required message.
  describe('c9 — duplicateType renders the duplicate message, not the generic one', () => {
    it('renders the duplicate message and not the generic required message', () => {
      component.actor = new InnovationUseActor();
      component.duplicateType = true;
      fixture.detectChanges();

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('already been reported on another row');
      expect(text).not.toContain('This field is required');

      // T-11 c3 — icon AND text, never text alone.
      const icon = fixture.debugElement.query(By.css('i.material-symbols-rounded'));
      expect(icon).toBeTruthy();
      expect((icon.nativeElement.textContent || '').trim()).toBe('warning');
    });
  });

  // c10 — 0 is accepted in every count field and is distinguishable from absent.
  describe('c10 — 0 is accepted and distinct from absent', () => {
    it('accepts 0 in a disaggregated field and the emitted row carries 0, not undefined', () => {
      component.actor = { ...new InnovationUseActor(), sex_age_disaggregation_not_apply: false };
      fixture.detectChanges();
      const emitSpy = jest.spyOn(component.update, 'emit');

      appInputLabelled('Women youth')!.setValue(0);
      fixture.detectChanges();
      TestBed.flushEffects();

      const emitted = emitSpy.mock.calls.at(-1)?.[0] as InnovationUseActor;
      expect(emitted.women_youth_count).toBe(0);
      expect(totalText()).toBe('0');
      expect(totalText()).not.toBe('');
    });

    it('accepts 0 in the aggregate field and the emitted row carries 0, not undefined', () => {
      component.actor = { ...new InnovationUseActor(), sex_age_disaggregation_not_apply: true };
      fixture.detectChanges();
      const emitSpy = jest.spyOn(component.update, 'emit');

      appInputLabelled('How many')!.setValue(0);
      fixture.detectChanges();
      TestBed.flushEffects();

      const emitted = emitSpy.mock.calls.at(-1)?.[0] as InnovationUseActor;
      expect(emitted.actors_count).toBe(0);
      expect(totalText()).toBe('0');
    });
  });

  // c11 — Pasting -1 and pasting 2.5 into each of the five count fields yields no negative
  // and no fractional value in the emitted row.
  describe('c11 — no negative, no fractional value via paste, in every count field', () => {
    const disaggregatedFields: Array<{ label: string; key: keyof InnovationUseActor }> = [
      { label: 'Women youth', key: 'women_youth_count' },
      { label: 'Women non-youth', key: 'women_not_youth_count' },
      { label: 'Men youth', key: 'men_youth_count' },
      { label: 'Men non-youth', key: 'men_not_youth_count' }
    ];

    disaggregatedFields.forEach(({ label, key }) => {
      it(`${key}: pasted -1 is blocked and pasted 2.5 yields an integer`, () => {
        component.actor = { ...new InnovationUseActor(), sex_age_disaggregation_not_apply: false };
        fixture.detectChanges();

        const de = appInputs().find(d => (d.componentInstance as InputComponent).label === label)!;
        const inputNumber = inputNumberInside(de);

        inputNumber.onPaste({ preventDefault: jest.fn(), clipboardData: { getData: () => '-1' } } as unknown as ClipboardEvent);
        fixture.detectChanges();
        expect((component.body()[key] as number | undefined) ?? 0).toBeGreaterThanOrEqual(0);

        inputNumber.onPaste({ preventDefault: jest.fn(), clipboardData: { getData: () => '2.5' } } as unknown as ClipboardEvent);
        fixture.detectChanges();
        const value = component.body()[key] as number;
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      });
    });

    it('actors_count: pasted -1 is blocked and pasted 2.5 yields an integer', () => {
      component.actor = { ...new InnovationUseActor(), sex_age_disaggregation_not_apply: true };
      fixture.detectChanges();

      const de = appInputs().find(d => (d.componentInstance as InputComponent).label === 'How many')!;
      const inputNumber = inputNumberInside(de);

      inputNumber.onPaste({ preventDefault: jest.fn(), clipboardData: { getData: () => '-1' } } as unknown as ClipboardEvent);
      fixture.detectChanges();
      expect((component.body().actors_count as number | undefined) ?? 0).toBeGreaterThanOrEqual(0);

      inputNumber.onPaste({ preventDefault: jest.fn(), clipboardData: { getData: () => '2.5' } } as unknown as ClipboardEvent);
      fixture.detectChanges();
      const value = component.body().actors_count as number;
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    });
  });

  // c12 — disabled hides the remove icon and makes every control non-interactive.
  describe('c12 — disabled hides remove and disables every control', () => {
    // NgModel registers its own CVA-disabled sync (setUpControl -> setDisabledState) that resolves
    // through a microtask (`resolvedPromise.then`), racing the [disabled] property binding on the
    // very same element. fakeAsync + tick() settles that microtask before asserting.
    it('hides the remove affordance and disables select, checkbox and count inputs (disaggregated)', async () => {
      component.actor = { ...new InnovationUseActor(), actor_type_id: 5, sex_age_disaggregation_not_apply: false };
      component.disabled = true;
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('[aria-label^="Remove actor"]'))).toBeNull();

      const selectDe = fixture.debugElement.query(By.directive(Select));
      expect((selectDe.componentInstance as Select).disabled).toBe(true);

      const checkboxDe = fixture.debugElement.query(By.directive(Checkbox));
      expect((checkboxDe.componentInstance as Checkbox).disabled).toBe(true);

      // Rendered-control truth (not the InputComponent wrapper property): the four disaggregated
      // app-inputs must each carry the disabled state on the PrimeNG control that actually renders.
      const inputs = appInputs();
      expect(inputs.length).toBe(4);
      inputs.forEach(de => expect(inputNumberInside(de).disabled).toBe(true));

      const specifyOther = fixture.debugElement.query(By.css('input[placeholder="Specify other"]'));
      expect(specifyOther.nativeElement.disabled).toBe(true);
    });

    // Aggregate-mode branch (@else in innovation-use-actor-item.component.html) was previously
    // unasserted by c12 — its own [disabled] binding on the "How many" app-input never ran.
    it('disables the How many control in aggregate mode', async () => {
      component.actor = { ...new InnovationUseActor(), sex_age_disaggregation_not_apply: true };
      component.disabled = true;
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const inputs = appInputs();
      expect(inputs.length).toBe(1);
      inputs.forEach(de => expect(inputNumberInside(de).disabled).toBe(true));
    });

    it('renders the remove affordance and enables controls when not disabled', () => {
      component.actor = new InnovationUseActor();
      component.disabled = false;
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('[aria-label^="Remove actor"]'))).toBeTruthy();
      const selectDe = fixture.debugElement.query(By.directive(Select));
      expect((selectDe.componentInstance as Select).disabled).toBe(false);
    });
  });

  // c13 is a STATIC check (no import in the file resolves to a server path or to actor-item; no
  // reference to ClarisaActorTypesEnum) and is discharged out of band by grep — see the
  // completion report, not this block. This block instead covers the Implementation-note
  // invariant (design.md §5.2 / requirements A4): result_actors_id is passed through unchanged.
  describe('result_actors_id is passed through unchanged (T-05 Implementation notes / §5.2)', () => {
    it(
      'does not include result_actors_id in any mutation helper, and passes it through unchanged on emit',
      fakeAsync(() => {
        component.actor = { ...new InnovationUseActor(), result_actors_id: 77, actor_type_id: 1 };
        fixture.detectChanges();
        tick();
        flush();
        const emitSpy = jest.spyOn(component.update, 'emit');

        component.onActorTypeChange(2);
        tick();
        flush();
        fixture.detectChanges();

        const emitted = emitSpy.mock.calls.at(-1)?.[0] as InnovationUseActor;
        expect(emitted.result_actors_id).toBe(77);
      })
    );
  });
});
