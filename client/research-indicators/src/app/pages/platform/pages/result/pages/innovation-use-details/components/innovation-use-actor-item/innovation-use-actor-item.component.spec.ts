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

  const inputNumberInside = (de: ReturnType<typeof appInputs>[number]): InputNumber =>
    de.query(By.directive(InputNumber)).componentInstance as InputNumber;

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
    it('disaggregated -> aggregate clears the four counts in the emitted row', fakeAsync(() => {
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
    }));

    it('aggregate -> disaggregated clears actors_count in the emitted row', fakeAsync(() => {
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
    }));
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
    it('shows the Specify other input only when actor_type_id === 5, and clears the name on change away', fakeAsync(() => {
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
    }));
  });

  // c8 — A row with no actor type shows the inline required message and the error border.
  // T-03 (changes/innovation-use-validation-warning-color): realigned after T-02 moved this site
  // to the warning token (R-IUW-002 scenario 1 — THEN); the BUT-it-must-NOT clauses (AC.4/AC.5)
  // are added as negative guards in the same test so the positive and negative claims sit
  // together over one render.
  // T-04 (RB-6, DD-10, D-8): the class-based border checks below were REPLACED, not kept
  // alongside — they were passing over a Tailwind class that never painted on the PrimeNG
  // element (DD-4 falsified). The fix moved the border to a `[style]` object binding.
  //
  // Why these assertions spy on `CSSStyleDeclaration.prototype.border`'s setter instead of
  // reading `element.style.border` / `getAttribute('style')` (what AC.5 literally names, and
  // what the design's own §6 table claims is "a real, readable string in jsdom"): it is NOT,
  // for a `var(...)` reference. Empirically verified in this exact jsdom test environment
  // (jest-preset-angular / jsdom's `cssstyle` package): `<div [style]="{border:'2px solid
  // var(--x)'}">` renders with `style.border === ''` and `getAttribute('style') === null` —
  // cssstyle parses the shorthand atomically and silently drops the whole declaration when any
  // component (here, the color) fails to parse; the identical binding with a literal colour
  // (the exemplar's own hardcoded literal colour, decimal RGB 230/159/0) DOES read back correctly. So
  // `element.style.border` cannot discriminate correct-and-broken here — it is unconditionally
  // empty either way, for every possible implementation. This is a second, independent instance
  // of D-8/KZ-017: a claim about jsdom's read-back that is confidently wrong when checked.
  // What jsdom's CSS engine WILL show is the assignment attempt itself: Angular applies a
  // `[style]="{ border: '…' }"` binding via a direct property write (`el.style.border = value`,
  // confirmed by spying on `CSSStyleDeclaration.prototype.setProperty`, which is never called
  // for this binding, vs. the accessor setter, which is). Spying on that setter observes the
  // exact string Angular hands the DOM — the same call a real browser's CSSOM receives and
  // would paint — before jsdom's own (irrelevant here) validation silently discards it. This is
  // strictly stronger evidence of correctness than the class list it replaces, and, per K-004,
  // is proven able to fail below (revert `actor:34`'s `[style]` binding and this spy sees zero
  // 'border' calls, or a stale value, instead of the current-state string).
  describe('c8 — missing actor type shows the required message and error border', () => {
    it('renders the required message (warning token, icon, text-size) and sets a warning-token inline-style border on the select — but leaves the asterisk and remove button red', () => {
      component.actor = new InnovationUseActor();
      component.actorNumber = 4;
      component.duplicateType = false;
      component.disabled = false;

      const borderSetSpy = jest.spyOn(CSSStyleDeclaration.prototype, 'border', 'set');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent as string).toContain('This field is required');

      // AC.1 / AC.5 (T-04) — scenario 1 THEN, border half: the invalid p-select's `[style]`
      // binding assigns a real 2px `var(--ac-warning-1)` inline border.
      expect(borderSetSpy.mock.calls).toContainEqual(['2px solid var(--ac-warning-1)']);
      borderSetSpy.mockRestore();

      // AC.3 (T-03) — scenario 1 AND: the required message keeps its `warning` icon AND its
      // `fs-[14]` text-size class. T-11 c3 precedent: icon AND text, never text alone. Only the
      // required message renders here (actor_type_id is unset, duplicateType is false), so
      // exactly one warning icon exists.
      const icon = fixture.debugElement.query(By.css('i.material-symbols-rounded'));
      expect(icon).toBeTruthy();
      expect((icon.nativeElement.textContent || '').trim()).toBe('warning');

      const messageSpan = fixture.debugElement
        .queryAll(By.css('span'))
        .find(s => (s.nativeElement as HTMLElement).textContent?.trim() === 'This field is required');
      expect(messageSpan).toBeTruthy();
      expect((messageSpan!.nativeElement as HTMLElement).className).toContain('fs-[14]');
      // The colour utility sits on the message's containing div (#requiredMessage template),
      // not on the span itself — see innovation-use-actor-item.component.html:3.
      const messageContainer = (messageSpan!.nativeElement as HTMLElement).closest('div');
      expect(messageContainer).toBeTruthy();
      expect(messageContainer!.className).toContain('text-[var(--ac-warning-1)]');
      expect(messageContainer!.className).not.toContain('text-[var(--ac-red-1)]');

      // AC.4 (T-03) — scenario 1 BUT: it must NOT change the red colour of the `Actor type*`
      // asterisk (D-2 negative guard — over-applying the warning token here is the defect this
      // guard exists to catch).
      const asterisk = fixture.debugElement
        .queryAll(By.css('span.text-red-500'))
        .find(s => (s.nativeElement as HTMLElement).textContent?.trim() === '*');
      expect(asterisk).toBeTruthy();

      // AC.5 (T-03) — scenario 1 BUT: it must NOT change the red colour of the card's remove
      // (`pi-times-circle`) button (D-2 negative guard).
      const removeButton = fixture.debugElement.query(By.css('[aria-label^="Remove actor"]'));
      expect(removeButton).toBeTruthy();
      expect((removeButton.nativeElement as HTMLElement).className).toContain('text-[var(--ac-red-1)]');
      expect((removeButton.nativeElement as HTMLElement).className).not.toContain('text-[var(--ac-warning-1)]');
    });

    // T-04 AC.1 negative half: a valid actor type must not set the border at all. Rendered
    // valid from the component's very first `detectChanges()` (not a transition into validity —
    // matching this file's existing per-`it()` fresh-fixture convention) so the ternary's `{}`
    // branch is exercised from the start, not inferred.
    it('sets no border style when the actor type is present (valid state)', () => {
      component.actor = { ...new InnovationUseActor(), actor_type_id: 1 };
      component.actorNumber = 4;
      component.duplicateType = false;
      component.disabled = false;

      const borderSetSpy = jest.spyOn(CSSStyleDeclaration.prototype, 'border', 'set');
      fixture.detectChanges();

      expect(borderSetSpy).not.toHaveBeenCalled();
      borderSetSpy.mockRestore();
    });
  });

  // T-04 (RB-6, DD-10) — actor:52, the "Specify other" input's border. Same defect (D-8), same
  // fix, same testing constraint as c8 above: no prior assertion existed for this site (T-02's
  // class fragment was never covered by a border-specific check here), so this is new coverage,
  // not a realignment.
  describe('c8b — missing "Specify other" name sets a warning-token inline-style border on the input', () => {
    it('sets a 2px var(--ac-warning-1) inline border when actor_type_id is OTHER and no custom name is set', () => {
      component.actor = { ...new InnovationUseActor(), actor_type_id: 5 };
      component.actorNumber = 4;
      component.duplicateType = false;
      component.disabled = false;

      const borderSetSpy = jest.spyOn(CSSStyleDeclaration.prototype, 'border', 'set');
      fixture.detectChanges();

      const specifyOther = fixture.debugElement.query(By.css('input[placeholder="Specify other"]'));
      expect(specifyOther).toBeTruthy();
      expect(borderSetSpy.mock.calls).toContainEqual(['2px solid var(--ac-warning-1)']);
      borderSetSpy.mockRestore();
    });

    it('sets no border style when a custom name is present (valid state)', () => {
      component.actor = { ...new InnovationUseActor(), actor_type_id: 5, actor_type_custom_name: 'local cooperatives' };
      component.actorNumber = 4;
      component.duplicateType = false;
      component.disabled = false;

      const borderSetSpy = jest.spyOn(CSSStyleDeclaration.prototype, 'border', 'set');
      fixture.detectChanges();

      const specifyOther = fixture.debugElement.query(By.css('input[placeholder="Specify other"]'));
      expect(specifyOther).toBeTruthy();
      expect(borderSetSpy).not.toHaveBeenCalled();
      borderSetSpy.mockRestore();
    });
  });

  // T-06 (R-IUR-016) — `Specify other` must be non-blank, trimmed, matching the server's
  // `valid_text` (§3.3 / N-11). `otherNameMissing` is the field's own, card-owned check — it
  // never flows through `requiredMode` (this is a plain `pInputText`, not an `app-input`).
  // Disqualifier (verbatim from the brief): a test that passes `''` only proves nothing, since
  // `''` is already caught by the pre-existing falsy check and is green on HEAD. The falsifying
  // input below is whitespace, `'   '`, which is valid (non-invalid) on HEAD and must become
  // invalid.
  describe('T-06 — Specify other must be non-blank, trimmed (R-IUR-016)', () => {
    // Scoped like c9 (KZ-001): the four disaggregated app-inputs legitimately render their OWN
    // "This field is required" messages on a fresh InnovationUseActor(), unrelated to
    // otherNameMissing. The card-level message (actor-type / "Specify other") is rendered from
    // the shared #requiredMessage template, which carries the distinguishing `rs-mt-[4]` class —
    // scoping to it isolates exactly the "Specify other" slot from the four counts' per-field
    // messages, matching c9's existing pattern in this same file.
    const cardLevelRequiredMessageShown = (): boolean =>
      fixture.debugElement
        .queryAll(By.css('div'))
        .filter(d => (d.nativeElement as HTMLElement).className.includes('rs-mt-[4]'))
        .some(d => (d.nativeElement as HTMLElement).textContent?.includes('This field is required'));

    // AC.1 / Falsifying input: '   ' must be invalid. Observed RED on pre-change HEAD (see the
    // completion report) — `otherNameMissing` returned `false` for a whitespace-only name because
    // the untrimmed `!value` check treats a non-empty string of spaces as present.
    it("a whitespace-only custom name is invalid, matching the server's trimmed valid_text", () => {
      component.actor = { ...new InnovationUseActor(), actor_type_id: 5, actor_type_custom_name: '   ' };
      fixture.detectChanges();

      expect(component.otherNameMissing).toBe(true);

      const specifyOther = fixture.debugElement.query(By.css('input[placeholder="Specify other"]'));
      expect(specifyOther).toBeTruthy();
      expect(cardLevelRequiredMessageShown()).toBe(true);
    });

    // AC.2 — a non-blank name must stay valid: the fix is a trim, not "always invalid".
    it('a non-blank custom name is valid: no required message', () => {
      component.actor = { ...new InnovationUseActor(), actor_type_id: 5, actor_type_custom_name: 'local cooperatives' };
      fixture.detectChanges();

      expect(component.otherNameMissing).toBe(false);
      expect(cardLevelRequiredMessageShown()).toBe(false);
    });

    // AC.3 — no asterisk is added by this requirement (OQ-2 stays open, not answered here). The
    // `Specify other` input carries no label/asterisk markup at all — it relies solely on its
    // `placeholder`. Scoped to `span.label` (the markup shape an added asterisk would need,
    // matching `Actor type`'s own `<span class="label">…<span class="text-red-500">*</span></span>`)
    // rather than a whole-card asterisk count, which would also see the four disaggregated
    // app-inputs' own (unrelated) asterisks — the same KZ-001 hazard as the message scoping above.
    it('adds no label/asterisk markup for Specify other (AC.3 — OQ-2 stays open)', () => {
      component.actor = { ...new InnovationUseActor(), actor_type_id: 5, actor_type_custom_name: '   ' };
      fixture.detectChanges();

      const specifyOther = fixture.debugElement.query(By.css('input[placeholder="Specify other"]'));
      expect(specifyOther).toBeTruthy();
      // Only `Actor type` and `Total` own a `span.label` in this card's own markup (the four
      // counts' labels are rendered by app-input, a different component, not asserted here) —
      // no third one for `Specify other`.
      const cardOwnLabelTexts = fixture.debugElement.queryAll(By.css('span.label')).map(de => (de.nativeElement as HTMLElement).textContent?.trim());
      expect(cardOwnLabelTexts).toEqual(['Actor type*', 'Total']);
    });
  });

  // c9 — duplicateType = true renders the duplicate message instead of the generic required message.
  //
  // T-04 note: this assertion was originally a whole-card `textContent` search for "This field is
  // required". T-04 makes that search unsound (KZ-001 / the task's own Disqualifier) — the four
  // count fields legitimately render their OWN "This field is required" messages on a fresh
  // `InnovationUseActor()` (they are empty), and that is correct, unrelated behavior. The
  // card-level messages (the actor-type required/duplicate template at `.html:2-7`, reused for
  // "Specify other") are rendered with the `rs-mt-[4]` class; `app-input`'s own internal message
  // uses `mt-1` instead (`input.component.html:64`) — scoping to `rs-mt-[4]` isolates exactly the
  // actor-type slot c9 is about from the four counts' per-field messages.
  describe('c9 — duplicateType renders the duplicate message, not the generic one', () => {
    it('renders the duplicate message and not the generic required message', () => {
      component.actor = new InnovationUseActor();
      component.duplicateType = true;
      fixture.detectChanges();

      const cardLevelMessages = fixture.debugElement
        .queryAll(By.css('div'))
        .filter(d => (d.nativeElement as HTMLElement).className.includes('rs-mt-[4]'));
      const cardLevelText = cardLevelMessages.map(d => (d.nativeElement as HTMLElement).textContent?.trim()).join(' ');
      expect(cardLevelText).toContain('already been reported on another row');
      expect(cardLevelText).not.toContain('This field is required');

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
    it('does not include result_actors_id in any mutation helper, and passes it through unchanged on emit', fakeAsync(() => {
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
    }));
  });

  // T-04 (R-IUR-004 S1/S2/S3, DD-2) — the four required counts and the one cross-field total
  // message. THE CENTRAL TRAP: total() === 0 is ALSO true when exactly one count is filled with
  // 0 and the other three are absent (see the class doc on total(), .ts:66-81) — driving the
  // total message off `total() === 0` alone would render it ALONGSIDE three per-field required
  // messages, exactly the forbidden state DD-2's "One message, never five" rules out. The
  // condition under test must therefore be "all four filled AND total() === 0", never total()
  // alone.
  //
  // Disqualifier guard: message-count assertions here are scoped either to one field's own
  // app-input container (fieldRequiredMessage, queried within that app-input's own DebugElement)
  // or to the total message's own distinguishing class (.actor-total-required-message) — never a
  // whole-card warning-icon count, which cannot tell "one total message" from "one leftover
  // required message" apart (KZ-001).
  describe('T-04 — four required counts and one cross-field total-positivity message', () => {
    const fieldRequiredMessage = (de: ReturnType<typeof appInputs>[number]): boolean =>
      de.queryAll(By.css('span')).some(s => (s.nativeElement as HTMLElement).textContent?.trim() === 'This field is required');

    const totalMessages = () => fixture.debugElement.queryAll(By.css('.actor-total-required-message'));

    // Falsifying input 1 (DC-2): a real, non-zero-sum row where one count is a deliberate 0 must
    // be entirely valid — no per-field required message, no total message, no amber border on
    // any of the four p-inputNumber hosts.
    it('0 / 5 / 0 / 0 is valid: no per-field required message, no total message, no amber border', () => {
      component.actor = {
        ...new InnovationUseActor(),
        sex_age_disaggregation_not_apply: false,
        women_youth_count: 0,
        women_not_youth_count: 5,
        men_youth_count: 0,
        men_not_youth_count: 0
      };
      fixture.detectChanges();

      appInputs().forEach(de => expect(fieldRequiredMessage(de)).toBe(false));
      expect(totalMessages().length).toBe(0);
      appInputs().forEach(de => {
        const hostEl = de.query(By.directive(InputNumber)).nativeElement as HTMLElement;
        expect(hostEl.className).not.toContain('border-[var(--ac-warning-1)]');
      });
      expect(totalText()).toBe('5');
    });

    // Falsifying input 2: all four filled with 0 must render EXACTLY one total message and ZERO
    // required messages — the state the naive `total() === 0` implementation collides with.
    it('0 / 0 / 0 / 0 renders exactly one total message and zero required messages', () => {
      component.actor = {
        ...new InnovationUseActor(),
        sex_age_disaggregation_not_apply: false,
        women_youth_count: 0,
        women_not_youth_count: 0,
        men_youth_count: 0,
        men_not_youth_count: 0
      };
      fixture.detectChanges();

      const requiredCount = appInputs().filter(de => fieldRequiredMessage(de)).length;
      expect(requiredCount).toBe(0);
      expect(totalMessages().length).toBe(1);
    });

    // Falsifying input 3: one field filled (Women youth = 3, a non-zero value), three empty, must
    // render three required messages and no total message — this covers R-IUR-004 S3 with a
    // non-zero fill. The sibling test below (falsifying input 4) covers the same shape with a 0
    // fill instead, which is the one that discriminates the `allFilled` conjunct in
    // `showTotalNotPositive`: with 0, `total() === 0` is ALSO true, so only the `allFilled` guard
    // stops the total message from rendering alongside the three required messages.
    it('one filled (Women youth = 3), three empty: three required messages, no total message', () => {
      component.actor = {
        ...new InnovationUseActor(),
        sex_age_disaggregation_not_apply: false,
        women_youth_count: 3
      };
      fixture.detectChanges();

      const requiredCount = appInputs().filter(de => fieldRequiredMessage(de)).length;
      expect(requiredCount).toBe(3);
      expect(totalMessages().length).toBe(0);
    });

    // Falsifying input 4 (the collision input): one field filled with 0, three empty — the input
    // that separates the two readings of `total() === 0` (all four filled and summing to 0, vs.
    // one 0 and three absent). Without `allFilled &&` in `showTotalNotPositive`, `total() === 0`
    // is true here too, and the total message would render ALONGSIDE the three required
    // messages — exactly DD-2's forbidden "one message, never five" violation.
    it('one filled with 0 (Women youth = 0), three empty: three required messages and NO total message', () => {
      component.actor = { ...new InnovationUseActor(), sex_age_disaggregation_not_apply: false, women_youth_count: 0 };
      fixture.detectChanges();
      expect(appInputs().filter(de => fieldRequiredMessage(de)).length).toBe(3);
      expect(totalMessages().length).toBe(0);
    });

    // R-IUR-004 AC.1: each of the four fields carries a red asterisk (rendered by app-input
    // itself via `[label]` + `requiredMode !== 'off'`, per the Structural fact in the brief — the
    // card must NOT also render its own asterisk for these fields, which would double it).
    it('each of the four counts carries exactly one red asterisk (rendered by app-input, not the card)', () => {
      component.actor = { ...new InnovationUseActor(), sex_age_disaggregation_not_apply: false };
      fixture.detectChanges();

      appInputs().forEach(de => {
        const asterisks = de.queryAll(By.css('span.text-red-500')).filter(s => (s.nativeElement as HTMLElement).textContent?.trim() === '*');
        expect(asterisks.length).toBe(1);
      });
    });

    // R-IUR-004 S2 gate: the total-positivity message must never fire on the aggregate path,
    // where total() returns actors_count (T-05's 'positive'-mode concern, not this one's).
    // WHAT THIS TEST CANNOT REACH (KZ-017): no single-guard mutation reddens it. The template
    // gates the ENTIRE disaggregated subtree — the four counts AND the showTotalNotPositive
    // @if — behind `@if (!body().sex_age_disaggregation_not_apply)` (.html:77-146), so in
    // aggregate mode Angular never instantiates the total-message @if and never evaluates the
    // getter. Removing the getter's early return was MEASURED not to redden this test; removing
    // the template gate alone does not either, because the early return still returns false.
    // The getter's early return is defense-in-depth against a call site that does not currently
    // exist and is untestable from the DOM by design. The four disaggregated counts are set to 0
    // here only to state the full collision shape explicitly — not because that gives this test
    // discriminating power, which it does not.
    it('does not render the total message on the aggregate path, even when actors_count is 0', () => {
      component.actor = {
        ...new InnovationUseActor(),
        sex_age_disaggregation_not_apply: true,
        actors_count: 0,
        women_youth_count: 0,
        women_not_youth_count: 0,
        men_youth_count: 0,
        men_not_youth_count: 0
      };
      fixture.detectChanges();

      expect(totalMessages().length).toBe(0);
    });
  });

  // T-05 (R-IUR-005) — aggregate path: `How many` (actors_count) required and positive via
  // `requiredMode="positive"`. S1's BUT clause (must NOT evaluate the four disaggregated counts
  // while this path is active) is the template's `@if`/`@else` gate, already proven by c1 above;
  // this block covers AC.1-AC.5 for the aggregate field itself.
  describe('T-05 — aggregate path: How many required and positive', () => {
    // Scoped exactly like T-04's fieldRequiredMessage: queried within one app-input's own
    // DebugElement, never a whole-card warning-icon count (KZ-001).
    const hasMessage = (de: ReturnType<typeof appInputs>[number], text: string): boolean =>
      de.queryAll(By.css('span')).some(s => (s.nativeElement as HTMLElement).textContent?.trim() === text);
    const requiredMessage = (de: ReturnType<typeof appInputs>[number]): boolean => hasMessage(de, 'This field is required');
    const positivityMessage = (de: ReturnType<typeof appInputs>[number]): boolean => hasMessage(de, 'Must be greater than 0');

    // AC.2 — empty renders the required message.
    // Mutation that reddens: delete `[requiredMode]="'positive'"` from the aggregate app-input
    // (.html:148-156) — with requiredMode back at its 'off' default and isRequired unset, no
    // message renders at all. MEASURED red (see report): the assertion below failed with
    // `received: false` when the binding was removed.
    it('empty actors_count renders the required message, not the positivity message', () => {
      component.actor = { ...new InnovationUseActor(), sex_age_disaggregation_not_apply: true, actors_count: undefined };
      fixture.detectChanges();

      const howMany = appInputs()[0];
      expect(requiredMessage(howMany)).toBe(true);
      expect(positivityMessage(howMany)).toBe(false);
    });

    // AC.3 — 0 renders the positivity message, DISTINGUISHABLE from the required message (0 is
    // filled, not empty). Mutation that reddens: same binding removal as above (no message at
    // all instead of the positivity one) — MEASURED red. A second, sharper mutation was also
    // measured: swapping `'positive'` for `'filled'` leaves 0 reading as filled-and-done, so
    // `positivityMessage` again reads false with no message rendered — this is what proves the
    // test pins the MODE, not merely "some mode is active".
    it('actors_count = 0 renders the positivity message, not the required message', () => {
      component.actor = { ...new InnovationUseActor(), sex_age_disaggregation_not_apply: true, actors_count: 0 };
      fixture.detectChanges();

      const howMany = appInputs()[0];
      expect(positivityMessage(howMany)).toBe(true);
      expect(requiredMessage(howMany)).toBe(false);
    });

    // AC.4 — > 0 is valid, no message.
    // KZ-017: no single-line mutation on the production binding reddens this assertion — a field
    // with `requiredMode` left at its 'off' default and no `isRequired` is ALSO silent at
    // actors_count = 1 (neither branch fires), so this assertion cannot tell "positive mode
    // evaluated 1 as valid" apart from "no mode ran at all". Kept as regression-protection for a
    // future change to the >0 boundary, not as evidence for this task's binding — labelled per
    // the brief's KZ-014 instruction rather than presented as proof.
    it('actors_count = 1 is valid: no required message, no positivity message (regression-protection, not discriminating)', () => {
      component.actor = { ...new InnovationUseActor(), sex_age_disaggregation_not_apply: true, actors_count: 1 };
      fixture.detectChanges();

      const howMany = appInputs()[0];
      expect(requiredMessage(howMany)).toBe(false);
      expect(positivityMessage(howMany)).toBe(false);
    });

    // AC.1 — red asterisk on `How many`, rendered by app-input itself (via [label] +
    // requiredMode !== 'off'), and exactly one. Mutation (binding removed): asterisk count drops
    // to 0 — MEASURED red.
    // WHAT THIS TEST CANNOT REACH (KZ-017): a duplicate card-side asterisk placed as a *sibling*
    // markup next to `<app-input>` (the literal forbidden trap this task's brief warns against)
    // was measured NOT to redden this assertion — `howMany.queryAll(...)` is scoped to the
    // app-input DebugElement's own subtree (deliberately, matching T-04's anti-KZ-001 pattern),
    // so it cannot see markup outside that element. The guarantee against doubling here is
    // structural, not this test's: the aggregate branch (.html:146-159) has no `<span
    // class="label">` wrapper of its own around `How many`, unlike the `Actor type` field above it
    // that does carry its own label+asterisk markup.
    it('How many carries exactly one red asterisk, rendered by app-input', () => {
      component.actor = { ...new InnovationUseActor(), sex_age_disaggregation_not_apply: true };
      fixture.detectChanges();

      const howMany = appInputs()[0];
      const asterisks = howMany.queryAll(By.css('span.text-red-500')).filter(s => (s.nativeElement as HTMLElement).textContent?.trim() === '*');
      expect(asterisks.length).toBe(1);
    });

    // AC.5 — the TRANSITION (KZ-015 / the Disqualifier verbatim): construct in DISAGGREGATED mode
    // with the four counts empty (rendering four live "This field is required" messages after
    // T-04), assert that starting state, THEN call the live onModeChange(true) toggle, THEN
    // assert the four messages are gone (not merely hidden — the four app-inputs no longer exist
    // in the DOM at all) and that How many now renders its own state. Also proves the falsifying
    // input from the brief: after the toggle, How many = 0 must show the positivity message, not
    // the required one — the same distinction AC.2/AC.3 proved statically, now proved to survive
    // a live transition.
    it('toggling on from a fully-amber disaggregated state clears the four messages and How many renders its own state', fakeAsync(() => {
      component.actor = { ...new InnovationUseActor(), sex_age_disaggregation_not_apply: false };
      fixture.detectChanges();
      tick();
      flush();

      // Arrange / assert the starting state the product actually reaches: four disaggregated
      // app-inputs, each carrying its own amber "This field is required" message (T-04's ground).
      const startingCounts = appInputs();
      expect(startingCounts.length).toBe(4);
      startingCounts.forEach(de => expect(requiredMessage(de)).toBe(true));

      // Act — the live toggle onModeChange() already clears the leaving mode's fields; T-05 does
      // not duplicate that.
      component.onModeChange(true);
      tick();
      flush();
      fixture.detectChanges();

      // Assert — gone, not merely hidden: the four disaggregated app-inputs are absent from the
      // DOM, and How many is the only app-input left, in its own (now-empty) required state.
      expect(appInputs().length).toBe(1);
      expect(appInputLabelled('Women youth')).toBeFalsy();
      expect(appInputLabelled('Women non-youth')).toBeFalsy();
      expect(appInputLabelled('Men youth')).toBeFalsy();
      expect(appInputLabelled('Men non-youth')).toBeFalsy();
      const howManyAfterToggle = appInputs()[0];
      expect(appInputLabelled('How many')).toBeTruthy();
      expect(requiredMessage(howManyAfterToggle)).toBe(true);

      // Extend the same live transition: setting How many = 0 after the toggle must show the
      // positivity message, never the required one — the falsifying input named in the brief.
      component.body.update(current => ({ ...current, actors_count: 0 }));
      fixture.detectChanges();

      const howManyAfterZero = appInputs()[0];
      expect(positivityMessage(howManyAfterZero)).toBe(true);
      expect(requiredMessage(howManyAfterZero)).toBe(false);
    }));
  });
});
