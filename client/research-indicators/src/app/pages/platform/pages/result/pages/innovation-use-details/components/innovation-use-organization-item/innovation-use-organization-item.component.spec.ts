// @akili-spec docs/specs/innovation-use/details-page (T-06 — innovation use organization card)
import { ComponentFixture, TestBed, fakeAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { InnovationUseOrganizationItemComponent } from './innovation-use-organization-item.component';
import { InnovationUseOrganization } from '@shared/interfaces/get-innovation-use-details.interface';
import { GetInstitutionsService } from '@shared/services/control-list/get-institutions.service';
import { GetInstitutionTypesService } from '@shared/services/control-list/get-institution-types.service';
import { GetClarisaInstitutionsSubTypesService } from '@shared/services/get-clarisa-institutions-subtypes.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { PartnerSelectedItemComponent } from '@shared/components/partner-selected-item/partner-selected-item.component';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { Checkbox } from 'primeng/checkbox';
import { ClarisaInstitutionsSubTypes } from '@shared/interfaces/get-clarisa-institutions-subtypes.interface';
import { GetInstitution } from '@shared/interfaces/get-institutions.interface';

// Distinctive fixture values (c7 / KZ-001): names chosen so a hardcoded taxonomy in the
// template could never coincidentally match them.
const INSTITUTION_TYPES: ClarisaInstitutionsSubTypes[] = [
  { code: 10, name: 'Zephyr Government Distinctive', description: null, parent_code: 0 },
  { code: 20, name: 'Quokka Private Sector Distinctive', description: null, parent_code: 0 },
  { code: 78, name: 'Other', description: null, parent_code: 0 }
];

// Type 10 resolves rows; type 20 resolves zero rows (c2's falsifying-input fixture pair).
const SUB_TYPES_BY_TYPE: Record<number, ClarisaInstitutionsSubTypes[]> = {
  10: [
    { code: 101, name: 'Marmoset National Ministry Distinctive', description: null, parent_code: 10 },
    { code: 102, name: 'Narwhal Local Government Distinctive', description: null, parent_code: 10 }
  ],
  20: []
};

const INSTITUTIONS: GetInstitution[] = [
  {
    description: '',
    code: 501,
    acronym: 'ACI',
    name: 'Acme Cooperative Institute Distinctive',
    html_full_name: '<strong>ACI</strong> - Acme Cooperative Institute Distinctive - Nairobi',
    institution_id: 501,
    institution_role_id: 1,
    institution_location_name: 'Nairobi',
    region_id: 501,
    isoAlpha2: 'KE',
    is_active: true,
    websiteLink: '',
    institution_type_id: 10,
    institution_locations: [{ code: 1, name: 'Nairobi', institution_id: 501, isoAlpha2: 'KE', isHeadquarter: true }],
    institution_type: { is_active: true, code: 10, name: 'Zephyr Government Distinctive', description: '', parent_code: null },
    disabled: false
  }
];

/**
 * Fidelity double for `GetClarisaInstitutionsSubTypesService`: it is NOT a signal (unlike the
 * other two control-list services) — it is an async populate (`getSubTypes`) over a plain Map,
 * read back synchronously by code (`list`). This double matches that shape field-for-field so a
 * rendered-options assertion here is evidence about the real wiring, not about a convenient
 * stand-in (KZ-001).
 */
class FakeSubTypesService {
  private readonly map = new Map<number, ClarisaInstitutionsSubTypes[]>();
  constructor(private readonly data: Record<number, ClarisaInstitutionsSubTypes[]>) {}
  async getSubTypes(depthLevel: number, code?: number): Promise<void> {
    if (!code) return;
    this.map.set(code, this.data[code] ?? []);
  }
  list(code?: number): ClarisaInstitutionsSubTypes[] {
    if (!code) return [];
    return this.map.get(code) ?? [];
  }
}

describe('InnovationUseOrganizationItemComponent', () => {
  let component: InnovationUseOrganizationItemComponent;
  let fixture: ComponentFixture<InnovationUseOrganizationItemComponent>;
  let originalMatchMedia: PropertyDescriptor | undefined;

  beforeAll(() => {
    // jsdom has no matchMedia; PrimeNG's Overlay probes it when a select panel opens
    // (responsive/modal check). A non-matching stub is enough (established pattern —
    // sp-toc-alignment-block.component.spec.ts).
    originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }))
    });
  });

  afterAll(() => {
    if (originalMatchMedia) {
      Object.defineProperty(window, 'matchMedia', originalMatchMedia);
    } else {
      delete (window as Partial<Window>).matchMedia;
    }
  });

  beforeEach(async () => {
    const mockInstitutionsService = { list: signal(INSTITUTIONS) };
    const mockInstitutionTypesService = { list: signal(INSTITUTION_TYPES) };
    const fakeSubTypesService = new FakeSubTypesService(SUB_TYPES_BY_TYPE);
    const mockAllModalsService = { openModal: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [InnovationUseOrganizationItemComponent],
      providers: [
        { provide: GetInstitutionsService, useValue: mockInstitutionsService },
        { provide: GetInstitutionTypesService, useValue: mockInstitutionTypesService },
        { provide: GetClarisaInstitutionsSubTypesService, useValue: fakeSubTypesService },
        { provide: AllModalsService, useValue: mockAllModalsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InnovationUseOrganizationItemComponent);
    component = fixture.componentInstance;
  });

  const selects = () => fixture.debugElement.queryAll(By.directive(Select));
  // Migrated (T-11): PrimeNG's Select names its focusable role="combobox" element from the
  // `ariaLabel` @Input, not from a host `aria-label` attribute — a plain `aria-label="..."` on
  // `<p-select>` sets a DOM attribute on the custom element (no role, not focusable) and names
  // nothing. Read the component's own `ariaLabel` property instead of the host attribute.
  const selectByAria = (label: string) => selects().find(de => (de.componentInstance as Select).ariaLabel === label);
  const appInputs = () => fixture.debugElement.queryAll(By.directive(InputComponent));
  const appInputInstances = (): InputComponent[] => appInputs().map(de => de.componentInstance as InputComponent);
  const appInputLabelled = (label: string) => appInputInstances().find(i => i.label === label);
  const inputNumberInside = (de: ReturnType<typeof appInputs>[number]): InputNumber => de.query(By.directive(InputNumber)).componentInstance as InputNumber;
  const specifyOtherInput = () => fixture.debugElement.query(By.css('input[aria-label="Specify other organization type"]'));

  const renderedOptionTexts = (selectDe: ReturnType<typeof selects>[number]): string[] => {
    (selectDe.componentInstance as Select).show();
    fixture.detectChanges();
    return Array.from(document.body.querySelectorAll('.p-select-option')).map(el => (el.textContent || '').trim());
  };

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  // T-11 c2 — discharged as RESOLUTION, not presence: the checkbox's <label for> must resolve
  // to the checkbox's own rendered <input>, not merely exist in the DOM (a `<label for="x">`
  // with no element carrying id="x" is worse than no label — it converts a visible defect into
  // a green presence check).
  describe('T-11 c2 — the known-toggle checkbox label resolves to its own input', () => {
    it("label.htmlFor resolves to the checkbox's rendered input element", () => {
      component.organization = new InnovationUseOrganization();
      component.organizationNumber = 3;
      fixture.detectChanges();

      const label = fixture.debugElement.query(By.css('label')).nativeElement as HTMLLabelElement;
      const resolved = (fixture.nativeElement as HTMLElement).querySelector(`#${label.htmlFor}`);
      const checkboxInput = fixture.debugElement.query(By.directive(Checkbox)).query(By.css('input')).nativeElement as HTMLInputElement;

      expect(label.htmlFor).toBe('is_organization_known_3');
      expect(resolved).toBe(checkboxInput);
    });
  });

  // c1 — Each identity path renders its own field set, and only its own.
  describe('c1 — exactly one identity path in the DOM', () => {
    it('known path renders the organization select and no unknown-path controls', () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: true };
      fixture.detectChanges();

      expect(selectByAria('Select the organization')).toBeTruthy();
      expect(selectByAria('Select the organization type')).toBeFalsy();
      expect(selectByAria('Select the organization sub-type')).toBeFalsy();
      expect(specifyOtherInput()).toBeFalsy();
      // R-IUC-001 (docs/specs/changes/innovation-use-organization-count-known-path): the count
      // field belongs to the unknown-organization path only — it must NOT render here.
      expect(appInputLabelled('Organization count')).toBeFalsy();
    });

    it('unknown path renders the organization-type select and no known-path controls', () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();

      expect(selectByAria('Select the organization type')).toBeTruthy();
      expect(selectByAria('Select the organization')).toBeFalsy();
      expect(fixture.debugElement.query(By.directive(PartnerSelectedItemComponent))).toBeFalsy();

      // R-IUC-001 Sc.2: the moved block must be unchanged on the path that keeps it. `c6` proves
      // [min]/[maxFractionDigits] behaviourally; these close the rest of the clause — the
      // placeholder, and the BUT-NOT ("must not become required"). Without them, deleting
      // placeholder="How many?" or adding [isRequired] from the moved markup would ship green.
      const countInput = appInputLabelled('Organization count')!;
      expect(countInput.placeholder).toBe('How many?');
      expect(countInput.isRequired).toBe(false);
    });

    // R-IUC-001 AC.3: the discriminator is is_organization_known ALONE — a ticked box with no
    // institution chosen yet is still the known path, so the count field stays hidden.
    it('known path with institution_id still unset also hides the count field', () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: true, institution_id: undefined };
      fixture.detectChanges();

      expect(appInputLabelled('Organization count')).toBeFalsy();
    });
  });

  // R-IUC-001 scenario 3 / D-5 / KZ-015: visibility must be verified as a TRANSITION on an
  // already-rendered fixture, never by re-instantiating the fixture in the end state.
  describe('R-IUC-001 Sc.3 — the count field tracks a live toggle of the checkbox', () => {
    it('toggling "Is the organization known?" on a rendered fixture hides then restores the count field', () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();

      expect(appInputLabelled('Organization count')).toBeTruthy();

      component.onKnownToggle(true);
      fixture.detectChanges();
      expect(appInputLabelled('Organization count')).toBeFalsy();

      component.onKnownToggle(false);
      fixture.detectChanges();
      expect(appInputLabelled('Organization count')).toBeTruthy();
    });
  });

  // -----------------------------------------------------------------------------------------------
  // T-10 (R-IUR-015, DD-12) — onKnownToggle now clears the fields of the path being left, in BOTH
  // directions, on the EMITTED row (Disqualifier: the card's `effect` emits upward, so a local-
  // state-only assertion would not catch a clear that never reaches the parent — asserted here via
  // the spied `update` emitter; the cross-component propagation into the PARENT's `body()` is
  // asserted separately in innovation-use-details.component.spec.ts, per this task's own Verify
  // split). Every `toBeNull()` below is deliberately strict, not `toBeFalsy()`: DD-12's clearing
  // must land as an explicit `null`, never `undefined` (DD-5b/T-09) — `undefined` would vanish
  // from `JSON.stringify` and let a stale server value survive if the user toggles back to the
  // just-cleared path before saving (see the parent-level DD-5b-interaction test for the
  // serialized-payload proof of that failure mode).
  // -----------------------------------------------------------------------------------------------
  describe('T-10 (R-IUR-015, DD-12) — onKnownToggle clears the path being left, symmetrically, in the emitted row', () => {
    it('AC.1 + AC.3: ticking clears institution_type_id, sub_institution_type_id, institution_type_custom_name and organization_count, and leaves institution_id (the path being ENTERED) untouched', async () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();

      await component.onInstitutionTypeChange(10);
      component.onSubTypeChange(1);
      component.onCustomNameChange('stale custom name');
      appInputLabelled('Organization count')!.setValue(5);
      fixture.detectChanges();
      expect(component.body().institution_type_id).toBe(10);

      const emitSpy = jest.spyOn(component.update, 'emit');
      component.onKnownToggle(true);
      fixture.detectChanges();

      const emitted = emitSpy.mock.calls.at(-1)?.[0] as InnovationUseOrganization;
      expect(emitted.institution_type_id).toBeNull();
      expect(emitted.sub_institution_type_id).toBeNull();
      expect(emitted.institution_type_custom_name).toBeNull();
      expect(emitted.organization_count).toBeNull();
      expect(emitted.institution_id).toBeUndefined();
    });

    it('AC.2 + AC.3: unticking clears institution_id, and leaves the unknown-path fields (the path being ENTERED) untouched', () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: true, institution_id: 501 };
      fixture.detectChanges();

      const emitSpy = jest.spyOn(component.update, 'emit');
      component.onKnownToggle(false);
      fixture.detectChanges();

      const emitted = emitSpy.mock.calls.at(-1)?.[0] as InnovationUseOrganization;
      expect(emitted.institution_id).toBeNull();
      expect(emitted.institution_type_id).toBeUndefined();
    });

    // Falsifying input, named verbatim in requirements.md/tasks.md.
    it('AC.6 falsifying input: fill the unknown path, tick, untick — the fields are empty, not restored', async () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();

      await component.onInstitutionTypeChange(10);
      component.onSubTypeChange(1);
      component.onCustomNameChange('stale custom name');
      appInputLabelled('Organization count')!.setValue(5);
      fixture.detectChanges();

      const emitSpy = jest.spyOn(component.update, 'emit');
      component.onKnownToggle(true);
      fixture.detectChanges();
      component.onKnownToggle(false);
      fixture.detectChanges();

      const emitted = emitSpy.mock.calls.at(-1)?.[0] as InnovationUseOrganization;
      expect(emitted.institution_type_id).toBeNull();
      expect(emitted.sub_institution_type_id).toBeNull();
      expect(emitted.institution_type_custom_name).toBeNull();
      expect(emitted.organization_count).toBeNull();
    });
  });

  // c2 — the sub-type select appears ONLY when the service returns rows for the chosen type.
  describe('c2 — sub-type control presence tracks the resolved rows, not the type selection itself', () => {
    it('type 10 resolves two rows -> the sub-type select is rendered', async () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();

      await component.onInstitutionTypeChange(10);
      fixture.detectChanges();

      expect(selectByAria('Select the organization sub-type')).toBeTruthy();
    });

    it('type 20 resolves zero rows -> the sub-type select is absent (rendered-absence assertion)', async () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();

      await component.onInstitutionTypeChange(20);
      fixture.detectChanges();

      expect(selectByAria('Select the organization sub-type')).toBeFalsy();
      expect(component.subTypeOptions().length).toBe(0);
    });
  });

  // R-IUR-008 (T-09) — Sub-type is required EXACTLY when the sub-type select renders, gated on
  // the same `subTypeOptions().length > 0` predicate the template already uses for the select
  // itself (DD-5) — never a re-derived is_active/root/depth-2 predicate. Type 10 resolves rows
  // (SUB_TYPES_BY_TYPE), type 20 resolves zero.
  describe('R-IUR-008 (T-09) — sub-type conditionally required, with amber border and message', () => {
    it('AC.1: type 10 (has sub-types) with no sub-type chosen renders the asterisk, the amber border and the required message', async () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();

      const borderSetSpy = jest.spyOn(CSSStyleDeclaration.prototype, 'border', 'set');
      try {
        await component.onInstitutionTypeChange(10);
        fixture.detectChanges();

        expect(component.subTypeMissing).toBe(true);
        expect(borderSetSpy.mock.calls).toContainEqual(['2px solid var(--ac-warning-1)']);
      } finally {
        borderSetSpy.mockRestore();
      }

      const subTypeLabel = fixture.debugElement.queryAll(By.css('span.label')).find(de => (de.nativeElement as HTMLElement).textContent?.startsWith('Sub-type'))!;
      expect(subTypeLabel.query(By.css('.text-red-500'))).toBeTruthy();

      const messages = fixture.debugElement.queryAll(By.css('.organization-subtype-required-message'));
      expect(messages.length).toBe(1);
      expect(messages[0].nativeElement.textContent as string).toContain('This field is required');
    });

    it('AC.1 negative: choosing a sub-type clears the amber border and the message while the asterisk stays (unconditional, matching Organization type)', async () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();
      await component.onInstitutionTypeChange(10);
      fixture.detectChanges();

      const borderSetSpy = jest.spyOn(CSSStyleDeclaration.prototype, 'border', 'set');
      try {
        component.onSubTypeChange(101);
        fixture.detectChanges();

        expect(component.subTypeMissing).toBe(false);
        expect(borderSetSpy.mock.calls).toContainEqual(['']);
      } finally {
        borderSetSpy.mockRestore();
      }

      expect(fixture.debugElement.queryAll(By.css('.organization-subtype-required-message')).length).toBe(0);
      const subTypeLabel = fixture.debugElement.queryAll(By.css('span.label')).find(de => (de.nativeElement as HTMLElement).textContent?.startsWith('Sub-type'))!;
      expect(subTypeLabel.query(By.css('.text-red-500'))).toBeTruthy();
    });

    it('AC.2: type 20 (no sub-types) never renders the Sub-type select, asterisk or message, and does not make the row invalid on that account', async () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();

      await component.onInstitutionTypeChange(20);
      fixture.detectChanges();

      expect(selectByAria('Select the organization sub-type')).toBeFalsy();
      expect(fixture.debugElement.queryAll(By.css('.organization-subtype-required-message')).length).toBe(0);
      expect(fixture.debugElement.queryAll(By.css('span.label')).some(de => (de.nativeElement as HTMLElement).textContent?.startsWith('Sub-type'))).toBe(false);
      expect(component.subTypeMissing).toBe(false);
    });

    // AC.3 + DD-5b falsifying input: pick a sub-typed type, choose a sub-type, then switch to a
    // type with no sub-types — the stale value must be cleared to an explicit `null`, never left
    // as `undefined` (JSON.stringify drops `undefined`, so `undefined` here would let the value
    // silently survive past `buildOrganizationPayload` on the unknown path — DD-5b).
    it('AC.3 / DD-5b: switching from a sub-typed type to one without sub-types clears sub_institution_type_id to an explicit null, not undefined', async () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();
      await component.onInstitutionTypeChange(10);
      fixture.detectChanges();
      component.onSubTypeChange(101);
      fixture.detectChanges();
      expect(component.body().sub_institution_type_id).toBe(101);

      await component.onInstitutionTypeChange(20);
      fixture.detectChanges();

      expect(component.body().sub_institution_type_id).toBeNull();
      expect(component.body().sub_institution_type_id).not.toBeUndefined();
      // Disqualifier-safe: JSON.stringify is the actual mechanism DD-5b names — a `toBeNull()`
      // check alone cannot show a key survives serialization, so assert that too.
      expect(JSON.stringify({ sub_institution_type_id: component.body().sub_institution_type_id })).toContain('"sub_institution_type_id":null');
      expect(selectByAria('Select the organization sub-type')).toBeFalsy();
    });

    // Disqualifier (per tasks.md T-09): this fake sub-types service cannot observe the is_active
    // or root filters that the real predicate applies (DD-5) — it can only confirm the component
    // reacts to whatever the mock returns. This suite proves the component's REACTION (asterisk /
    // border / message / clearing) is wired to `subTypeOptions().length > 0`; it does NOT and
    // cannot prove that predicate agrees with the SQL side's `getInstitutionTypesByDepthLevel`
    // catalog (that equivalence is T-14's job, enumerated against the real service).
  });

  // c3 — institution_type_id === 78 reveals the Specify other input.
  describe('c3 — OTHER (78) reveals Specify other; any other type hides it', () => {
    it('type 78 shows the Specify other input; type 10 does not', async () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();

      expect(specifyOtherInput()).toBeFalsy();

      await component.onInstitutionTypeChange(78);
      fixture.detectChanges();
      expect(specifyOtherInput()).toBeTruthy();

      await component.onInstitutionTypeChange(10);
      fixture.detectChanges();
      expect(specifyOtherInput()).toBeFalsy();
    });
  });

  // c4 — T-07 (R-IUR-006 AC.1) puts a red asterisk on the KNOWN path's `Organization` label.
  // T-08 (R-IUR-007 AC.1) adds a second, card-owned asterisk on the UNKNOWN path's
  // `Organization type` label, unconditional on emptiness — plus `app-input`'s own asterisk on
  // `Organization count` (actor-card pattern, DD-1: `requiredMode !== 'off'` renders one there).
  describe('c4 — required-asterisk nodes match the active path', () => {
    it('renders exactly one .text-red-500 node in the known path, on the Organization label, containing it', () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: true };
      fixture.detectChanges();

      const asterisks = fixture.debugElement.queryAll(By.css('.text-red-500'));
      expect(asterisks.length).toBe(1);
      // Containment, not co-occurrence (Disqualifier/hygiene item 4): the asterisk must be a
      // descendant of the label that reads "Organization", not merely present somewhere on the
      // same row as a label containing that text.
      const label = fixture.debugElement.query(By.css('span.label'));
      expect((label.nativeElement as HTMLElement).textContent).toContain('Organization');
      expect(label.query(By.css('.text-red-500'))).toBeTruthy();
    });

    it('renders exactly two .text-red-500 nodes in the unknown path — the card-owned Organization type asterisk and app-input\'s own Organization count asterisk — unconditional on emptiness, even with OTHER + sub-type visible (T-08)', async () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();
      await component.onInstitutionTypeChange(78);
      fixture.detectChanges();

      const asterisks = fixture.debugElement.queryAll(By.css('.text-red-500'));
      expect(asterisks.length).toBe(2);
      const typeLabel = fixture.debugElement.queryAll(By.css('span.label')).find(de => (de.nativeElement as HTMLElement).textContent?.includes('Organization type'))!;
      expect(typeLabel.query(By.css('.text-red-500'))).toBeTruthy();
    });
  });

  // R-IUR-007 (T-08) — the Disqualifier's falsifying input: ticking the known checkbox must make
  // the unknown path's asterisk and message disappear. Asserted by CONTAINER absence (the type
  // select itself, and the message hook), never by a null query on a decorative class — a null
  // query cannot tell "rendered without an asterisk" apart from "not rendered at all".
  describe('R-IUR-007 (T-08) — falsifying input: ticking "Is the organization known?" removes the type container', () => {
    it('the type select, its asterisk and its message all disappear once the known path activates', () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();

      // Active (unknown) path: the container exists, with its own asterisk and message.
      expect(selectByAria('Select the organization type')).toBeTruthy();
      expect(fixture.debugElement.queryAll(By.css('.organization-type-required-message')).length).toBe(1);

      component.onKnownToggle(true);
      fixture.detectChanges();

      // Inactive path now: the CONTAINER is absent (Disqualifier) — the type select is gone from
      // the DOM entirely (not merely unmarked), and so is its message hook.
      expect(selectByAria('Select the organization type')).toBeFalsy();
      expect(fixture.debugElement.queryAll(By.css('.organization-type-required-message')).length).toBe(0);
    });

    // Attempt-3 remediation (Reviewer attempt-2 Issue 1): the amber-border half of AC.2 was
    // implemented on the `Organization type` select's
    // `[style]="organizationTypeMissing ? { border: '2px solid var(--ac-warning-1)' } : {}"`
    // binding but asserted nowhere in this file — deleting that binding
    // left the org-card suite green. Mirrors the known-path exemplar tests below, in the
    // "R-IUR-006 — known path: institution required, with message precedence (T-07)" describe
    // (its "AC.2" positive test and its "AC.2 negative" test), for the unknown path's
    // organization-TYPE select instead of the organization select. Cited by title, not by line
    // number (attempt-4: a prior line-number citation here was invalidated by this same diff's
    // own insertion, twice over — `A-N4`).
    //
    // Mechanism (same three traps as the exemplar, and all load-bearing here too):
    // 1. Angular memoizes the last style value it wrote per property — a spy installed AFTER the
    //    state has settled records zero calls. For an unknown-path fixture with a missing type,
    //    the write happens on the type select's FIRST `detectChanges()`, so the spy goes in
    //    before that call, not after.
    // 2. The type select does not pre-exist that first pass either (unknown path renders it fresh
    //    via the `@else` branch), so only a `CSSStyleDeclaration.prototype`-wide spy — not an
    //    element-scoped one — can observe it. That also means this assertion is CARD-WIDE: it
    //    proves the amber value was written somewhere in the card during this pass, not that it
    //    landed on the type select specifically. Attribution comes from the discriminating
    //    mutation (deleting the `Organization type` select's `[style]` binding, run and observed
    //    red in the attempt-3 report), not from
    //    this test alone — it is titled as a card-wide write, not an element-attributed one.
    // 3. `element.style.border` itself is unreadable here (`cssstyle@2.3.0` drops a shorthand
    //    carrying `var()`), which is why the setter spy exists instead of a direct style read.
    it('AC.2: an unfilled unknown-path row writes the amber border somewhere in the card on construction', () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };

      const borderSetSpy = jest.spyOn(CSSStyleDeclaration.prototype, 'border', 'set');
      try {
        fixture.detectChanges();

        expect(borderSetSpy.mock.calls).toContainEqual(['2px solid var(--ac-warning-1)']);
      } finally {
        borderSetSpy.mockRestore();
      }
    });

    // Negative half, arranged via the TRANSITION the product performs (KZ-015): fill the type
    // through `onInstitutionTypeChange(20)` AFTER the initial pass has settled, so
    // `organizationTypeMissing` goes false. A fresh spy is opened only after that first
    // `detectChanges()`, so the construction-time write the positive test above exercises cannot
    // leak into this window.
    //
    // Fixture correction (attempt-4, Reviewer attempt-3 Issue 1): type **20**, not type 10. Per
    // `SUB_TYPES_BY_TYPE` at the top of this file, type 10 is the SUB-TYPED fixture (two rows —
    // see c2's first test above) and type 20 is the one that resolves zero rows. Filling type 10
    // here would render the sub-type select with an empty required value inside this spy window —
    // a second, unrelated amber-border source (`R-IUR-008`/T-09 gives that control its own
    // `[style]` write), which would redden this test once T-09 lands, for a reason that has
    // nothing to do with what this test names. Type 20 reaches the same
    // `organizationTypeMissing === false` end state with no sub-type select rendered at all.
    //
    // Strengthened to a positive assertion (Leader's ruling on Issue 2, remediation (a)). The
    // prior version asserted `not.toContainEqual([amber])` — vacuously true whenever the amber
    // value is never written at all, which is also true under the defect this test exists to
    // catch (the write staying unconditional across the transition; see the mechanism note on the
    // positive test above: Angular memoizes the last value written per style property, so an
    // unconditional write and a correctly-cleared write are indistinguishable to a spy that only
    // checks "was amber written", if nothing further gets written either way). Observed instead:
    // Angular's style-map diff calls `removeStyle` for a property dropped from the bound object,
    // and for a no-dash CSS property (`border` has none) that assigns `el.style.border = ''` —
    // which the `CSSStyleDeclaration.prototype` setter spy below DOES record. Verified reddening:
    // with the `Organization type` select's `[style]` binding forced unconditionally amber
    // (`[style]="{ border: '2px solid var(--ac-warning-1)' }"`), this assertion fails, because no
    // `''` write ever occurs (see the attempt-4 report for the observed red).
    it('AC.2 negative: filling the organization type clears the amber-border write', async () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();

      const borderSetSpy = jest.spyOn(CSSStyleDeclaration.prototype, 'border', 'set');
      try {
        await component.onInstitutionTypeChange(20);
        fixture.detectChanges();

        expect(borderSetSpy.mock.calls).toContainEqual(['']);
      } finally {
        borderSetSpy.mockRestore();
      }
    });
  });

  // R-IUR-009 (T-08) — the Disqualifier's other falsifying input: `Organization count = 0` must
  // render the POSITIVITY message, never the required one — the two are distinguishable in the DOM.
  describe('R-IUR-009 (T-08) — falsifying input: Organization count = 0 shows the positivity message, not required', () => {
    it('empty shows the required message; 0 shows the positivity message', () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();

      const countDe = appInputs().find(d => (d.componentInstance as InputComponent).label === 'Organization count')!;
      expect((countDe.nativeElement as HTMLElement).textContent).toContain('This field is required');

      appInputLabelled('Organization count')!.setValue(0);
      fixture.detectChanges();

      const textAfterZero = (countDe.nativeElement as HTMLElement).textContent || '';
      expect(textAfterZero).toContain('Must be greater than 0');
      expect(textAfterZero).not.toContain('This field is required');
    });
  });

  // R-IUR-006 / DD-9 — the field-level required message on the known path, and its precedence
  // over the row-level `showNotIdentifiedMessage`. AC.3's falsifying input: an UNTOUCHED
  // known-path row with no institution must show EXACTLY ONE message (today: zero).
  describe('R-IUR-006 — known path: institution required, with message precedence (T-07)', () => {
    // Each message source gets its own hook so a count can be attributed to its source
    // (Disqualifier: a whole-card `warning`-icon count conflates the two message kinds).
    // Field-level, known path (T-07): the `.organization-required-message` class hook.
    // Field-level, unknown path (T-08): the `.organization-type-required-message` class hook.
    // Row-level (`#notIdentifiedMessage`, pre-existing): matched by its own exact copy, never
    // by a shared icon count.
    const fieldLevelMessages = () => fixture.debugElement.queryAll(By.css('.organization-required-message'));
    const organizationTypeMessages = () => fixture.debugElement.queryAll(By.css('.organization-type-required-message'));
    const rowLevelMessages = () =>
      fixture.debugElement
        .queryAll(By.css('span'))
        .filter(s => (s.nativeElement as HTMLElement).textContent?.trim() === 'This row does not identify an organization yet');

    it('AC.3 falsifying input: an UNTOUCHED known-path row with no institution shows EXACTLY ONE message (the field-level one), never zero, never two', () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: true, institution_id: undefined };
      fixture.detectChanges();

      // Untouched: the component was never mutated after construction.
      expect(component.touched()).toBe(false);

      expect(fieldLevelMessages().length).toBe(1);
      expect(fieldLevelMessages()[0].nativeElement.textContent as string).toContain('This field is required');
      // The suppressed row-level message must not ALSO render (never two).
      expect(rowLevelMessages().length).toBe(0);
      expect(fixture.nativeElement.textContent as string).not.toContain('does not identify an organization yet');
    });

    it('AC.1: the red asterisk renders on the known path even when the field is already filled', () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: true, institution_id: 501 };
      fixture.detectChanges();

      const asterisks = fixture.debugElement.queryAll(By.css('.text-red-500'));
      expect(asterisks.length).toBe(1);
    });

    it('AC.4: a filled known-path row shows no field-level message and no row-level message', () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: true, institution_id: 501 };
      fixture.detectChanges();

      expect(fieldLevelMessages().length).toBe(0);
      expect(rowLevelMessages().length).toBe(0);
    });

    // AC.2 border half, per DD-3, arranged via a production-reachable TRANSITION (KZ-015 hygiene
    // item, T-08 gate): T-07's original arrangement drove this through `onInstitutionChange(
    // undefined)`, but the organization select carries no `[showClear]` — the UI cannot produce
    // that clearing transition. The route the product actually performs into touched + known +
    // empty is checking "Is the organization known?" on an unfilled (unknown-path) row, which
    // already exists in this file for another assertion (`onKnownToggle`). That transition also
    // means the select does not exist before it fires (unknown path, `@else` branch) — DD-3: an
    // element-scoped spy needs the element to pre-exist, so only the prototype-wide spy can
    // observe this FIRST style write. `try/finally` restores it even if an assertion throws
    // (hygiene item 4) so a red here cannot leave every later write in this file swallowed.
    it('AC.2: checking "Is the organization known?" on an unfilled row writes the amber border on the newly-rendered organization select', () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();

      const borderSetSpy = jest.spyOn(CSSStyleDeclaration.prototype, 'border', 'set');
      try {
        component.onKnownToggle(true);
        fixture.detectChanges();

        expect(component.touched()).toBe(true);
        expect(borderSetSpy.mock.calls).toContainEqual(['2px solid var(--ac-warning-1)']);
      } finally {
        borderSetSpy.mockRestore();
      }
    });

    // Retitled (hygiene item 2): the spy below is CARD-WIDE (`CSSStyleDeclaration.prototype`),
    // so the claim it backs is card-wide too — "on the organization select" overstated its scope.
    it('AC.2 negative: a filled known-path row never writes the amber border anywhere in the card', () => {
      const borderSetSpy = jest.spyOn(CSSStyleDeclaration.prototype, 'border', 'set');
      try {
        component.organization = { ...new InnovationUseOrganization(), is_organization_known: true, institution_id: 501 };
        fixture.detectChanges();

        expect(borderSetSpy.mock.calls).not.toContainEqual(['2px solid var(--ac-warning-1)']);
      } finally {
        borderSetSpy.mockRestore();
      }
    });

    // KZ-015 (same fix as the AC.2 border test above): arranged via `onKnownToggle(true)` on an
    // unfilled row, the transition the product performs, not `onInstitutionChange(undefined)`
    // (UI-unreachable — no `[showClear]` on this select).
    it('a TOUCHED known-path row with no institution still shows exactly the field-level message (precedence holds touched too)', () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();

      component.onKnownToggle(true);
      fixture.detectChanges();

      expect(component.touched()).toBe(true);
      expect(fieldLevelMessages().length).toBe(1);
      expect(rowLevelMessages().length).toBe(0);
    });

    // T-08: the row-level message is now suppressed on the UNKNOWN path too, once its own
    // field-level state (`organizationTypeMissing`) is missing — extending the same precedence
    // T-07 established for the known path. Retitled from "does not suppress... (T-08 not yet
    // implemented)": that premise is what T-08 deliberately makes false.
    it('T-08: with the organization type missing, the row-level message is suppressed in favor of the type field-level message', () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();

      const countInput = appInputLabelled('Organization count')!;
      countInput.setValue(3);
      fixture.detectChanges();

      expect(rowLevelMessages().length).toBe(0);
      expect(fieldLevelMessages().length).toBe(0);
      expect(organizationTypeMessages().length).toBe(1);
      expect(organizationTypeMessages()[0].nativeElement.textContent as string).toContain('This field is required');
    });
  });

  // c5 — a touched row satisfying neither path shows the message; an untouched row does not.
  describe('c5 — the not-yet-identified message tracks touched, not just unsatisfied', () => {
    it('an untouched, unidentified row shows no message', () => {
      component.organization = new InnovationUseOrganization();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent as string).not.toContain('does not identify an organization yet');
    });

    // T-08 rewrite (forward pointer 1): T-07's version of this test asserted the row-level
    // message rendered here. That is now false — with `Organization type` missing on the unknown
    // path, T-08's field-level message takes precedence (DD-9, extended) and the row-level one is
    // suppressed. Two stale claims travelled with the old assertions, both corrected here:
    // (a) its comment claimed this `@if` branch was the ONLY source of a `warning` icon in the
    //     DOM — false the moment the type field-level message lands (KZ-014: no longer true);
    // (b) it used `query` (first match) rather than `queryAll` — with a second `warning` icon now
    //     in the DOM, `query` would silently start matching THIS test's own new icon instead of
    //     the row-level one and stay green regardless of which message actually rendered
    //     (KZ-001: stops measuring what it names). `queryAll` is used throughout below instead.
    it('a touched row (count entered) that still identifies no organization shows the type field-level message, not the suppressed row-level one', () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();

      appInputLabelled('Organization count')!.setValue(3);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent as string).not.toContain('does not identify an organization yet');

      const typeMessages = fixture.debugElement.queryAll(By.css('.organization-type-required-message'));
      expect(typeMessages.length).toBe(1);
      expect(typeMessages[0].nativeElement.textContent as string).toContain('This field is required');

      // Icon AND text, never text alone (T-11 c3) — and now `queryAll` because a second
      // `warning`-icon source exists in the DOM (see comment above).
      const icons = fixture.debugElement.queryAll(By.css('i.material-symbols-rounded'));
      expect(icons.length).toBe(1);
      expect((icons[0].nativeElement.textContent || '').trim()).toBe('warning');
    });

    it('a touched row that DOES identify an organization shows no message', async () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();

      await component.onInstitutionTypeChange(10);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent as string).not.toContain('does not identify an organization yet');
    });
  });

  // c6 — organization_count rejects negatives/fractions via paste and typing; 0 is enterable and
  // stored (distinct from absent). Advisory (c), T-08 attempt-3: this is a separate claim from
  // R-IUR-009's positivity rule — 0 is NOT a valid final value there ("Must be greater than 0"),
  // but it must still reach `body()`/the emitted row rather than being silently dropped to
  // `undefined`, which is what makes R-IUR-009 AC.2 verifiable in the first place.
  describe('c6 — organization_count: no negative, no fractional, 0 enterable/stored (not necessarily valid) and distinct from absent', () => {
    it(
      'pasted -1 is blocked and pasted 2.5 yields an integer >= 0',
      fakeAsync(() => {
        component.organization = new InnovationUseOrganization();
        fixture.detectChanges();

        const de = appInputs().find(d => (d.componentInstance as InputComponent).label === 'Organization count')!;
        const inputNumber = inputNumberInside(de);

        inputNumber.onPaste({ preventDefault: jest.fn(), clipboardData: { getData: () => '-1' } } as unknown as ClipboardEvent);
        fixture.detectChanges();
        expect((component.body().organization_count as number | undefined) ?? 0).toBeGreaterThanOrEqual(0);

        inputNumber.onPaste({ preventDefault: jest.fn(), clipboardData: { getData: () => '2.5' } } as unknown as ClipboardEvent);
        fixture.detectChanges();
        const value = component.body().organization_count as number;
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      })
    );

    it('0 is enterable and stored/emitted as 0, not dropped to undefined (validity is a separate, R-IUR-009 claim)', () => {
      component.organization = new InnovationUseOrganization();
      fixture.detectChanges();
      const emitSpy = jest.spyOn(component.update, 'emit');

      appInputLabelled('Organization count')!.setValue(0);
      fixture.detectChanges();
      TestBed.flushEffects();

      const emitted = emitSpy.mock.calls.at(-1)?.[0] as InnovationUseOrganization;
      expect(emitted.organization_count).toBe(0);
    });
  });

  // c7 — every vocabulary is read from its CLARISA control-list service, asserted on the
  // RENDERED options (KZ-001 disqualifier: toHaveBeenCalled proves wiring, not source).
  describe('c7 — NFR-IUP-005: rendered options come from the CLARISA services, not a hardcoded array', () => {
    it('organization-type select renders exactly the distinctive names from GetInstitutionTypesService', () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();

      const texts = renderedOptionTexts(selectByAria('Select the organization type')!);
      expect(texts).toEqual(['Zephyr Government Distinctive', 'Quokka Private Sector Distinctive', 'Other']);
    });

    it('sub-type select renders exactly the distinctive names from GetClarisaInstitutionsSubTypesService.list()', async () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();
      await component.onInstitutionTypeChange(10);
      fixture.detectChanges();

      const texts = renderedOptionTexts(selectByAria('Select the organization sub-type')!);
      expect(texts).toEqual(['Marmoset National Ministry Distinctive', 'Narwhal Local Government Distinctive']);
    });

    it('organization (institution) select renders the distinctive html_full_name from GetInstitutionsService', () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: true };
      fixture.detectChanges();

      // Virtual scroll never paints real rows under jsdom (no viewport measurement), so the
      // DOM-read technique used for the other two selects is inconclusive here. `visibleOptions()`
      // is the exact signal PrimeNG feeds the CDK-virtual-scroll `items` binding (primeng-select.mjs
      // line 721) — it IS what gets rendered, one step short of painted pixels.
      const selectInstance = selectByAria('Select the organization')!.componentInstance as Select;
      const visible = selectInstance.visibleOptions() as GetInstitution[];
      expect(visible.map(institution => institution.html_full_name)).toEqual([INSTITUTIONS[0].html_full_name]);
    });
  });

  // c8 — disabled hides add/remove and makes every control non-interactive.
  describe('c8 — disabled hides remove and disables every control', () => {
    it('known path: hides remove, disables checkbox, organization select and the request-partner button', async () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: true, institution_id: 501 };
      component.disabled = true;
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('[aria-label^="Remove organization"]'))).toBeNull();

      const checkboxDe = fixture.debugElement.query(By.directive(Checkbox));
      expect((checkboxDe.componentInstance as Checkbox).disabled).toBe(true);

      const selectDe = selectByAria('Select the organization')!;
      expect((selectDe.componentInstance as Select).disabled).toBe(true);

      // R-IUC-001: the count field belongs to the unknown-organization path only, so it must be
      // absent here — not merely disabled.
      const inputs = appInputs();
      expect(inputs.length).toBe(0);

      const buttons = fixture.debugElement.queryAll(By.css('button'));
      const requestButton = buttons.find(b => (b.nativeElement.textContent || '').includes('here'));
      expect(requestButton!.nativeElement.disabled).toBe(true);
    });

    it('unknown path: disables organization-type, sub-type and Specify other', async () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      component.disabled = true;
      fixture.detectChanges();

      // Fix 2 (Lens B issue 1): type 10 resolves sub-type rows, so the sub-type select is
      // actually in the DOM here and its own [disabled] binding gets exercised — the prior
      // version only reached type 78, whose empty resolution removes the control via @if
      // before the disabled binding is ever evaluated.
      await component.onInstitutionTypeChange(10);
      fixture.detectChanges();
      // NgModel's own CVA-disabled sync resolves through a microtask that races the [disabled]
      // property binding on the same element (same finding as T-05's c12) — settle it before
      // asserting.
      await fixture.whenStable();
      fixture.detectChanges();

      const typeSelectDe = selectByAria('Select the organization type')!;
      expect((typeSelectDe.componentInstance as Select).disabled).toBe(true);

      const subTypeSelectDe = selectByAria('Select the organization sub-type')!;
      expect((subTypeSelectDe.componentInstance as Select).disabled).toBe(true);

      await component.onInstitutionTypeChange(78);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const specifyOther = specifyOtherInput();
      expect(specifyOther.nativeElement.disabled).toBe(true);

      // Restores the coverage that `execution.md` decision E-1 recorded as lost: removing the
      // known-path `forEach` left the count field's [disabled] binding asserted nowhere, because
      // this sibling only ever checked the two selects and Specify-other. The field now lives on
      // THIS path, so its binding belongs here. Deleting [disabled]="disabled" from the moved
      // block would otherwise ship green.
      const countDe = appInputs().find(de => (de.componentInstance as InputComponent).label === 'Organization count')!;
      expect(inputNumberInside(countDe).disabled).toBe(true);
    });

    it('renders the remove affordance and enables controls when not disabled', () => {
      component.organization = new InnovationUseOrganization();
      component.disabled = false;
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('[aria-label^="Remove organization"]'))).toBeTruthy();
    });
  });

  // c9 — a saved-and-reloaded row restores institution_id / institution_type_id /
  // sub_institution_type_id / institution_type_custom_name / organization_count.
  describe('c9 — a saved-and-reloaded row restores every identifier', () => {
    it('known-path row restores institution_id and organization_count', () => {
      component.organization = {
        ...new InnovationUseOrganization(),
        is_organization_known: true,
        institution_id: 501,
        organization_count: 7
      };
      fixture.detectChanges();

      expect(component.body().institution_id).toBe(501);
      expect(component.body().organization_count).toBe(7);
      expect(fixture.debugElement.query(By.directive(PartnerSelectedItemComponent))).toBeTruthy();
    });

    it('unknown-path row restores institution_type_id, sub_institution_type_id and the count', async () => {
      component.organization = {
        ...new InnovationUseOrganization(),
        is_organization_known: false,
        institution_type_id: 10,
        sub_institution_type_id: 102,
        organization_count: 4
      };
      fixture.detectChanges();
      // ngOnInit fires the sub-type load without the test having a handle on the promise —
      // whenStable() drains it (mirrors the real "reload a saved row" timing).
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.body().institution_type_id).toBe(10);
      expect(component.body().sub_institution_type_id).toBe(102);
      expect(component.body().organization_count).toBe(4);

      expect(selectByAria('Select the organization sub-type')).toBeTruthy();
    });

    it('custom name restores when institution_type_id is 78', async () => {
      component.organization = {
        ...new InnovationUseOrganization(),
        is_organization_known: false,
        institution_type_id: 78,
        institution_type_custom_name: 'Marmoset Cooperative'
      };
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.body().institution_type_custom_name).toBe('Marmoset Cooperative');
      expect(specifyOtherInput().nativeElement.value).toBe('Marmoset Cooperative');
    });
  });

  // Fix 1 (Lens A): ngOnChanges is a real second ingress path — a parent-driven row swap must
  // sync the sub-type control the same way ngOnInit does. This is the ONLY test in the file that
  // drives an input through `setInput`, the sole way to make Angular actually run ngOnChanges
  // (a direct property assignment on the instance never produces a SimpleChanges record).
  describe('ngOnChanges — a parent-driven row replacement resyncs sub-types like ngOnInit', () => {
    it('a blank row replaced with a type-10/sub-102 row renders the sub-type select with its resolved options', async () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();
      expect(selectByAria('Select the organization sub-type')).toBeFalsy();

      fixture.componentRef.setInput('organization', {
        ...new InnovationUseOrganization(),
        is_organization_known: false,
        institution_type_id: 10,
        sub_institution_type_id: 102
      });
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const subTypeSelectDe = selectByAria('Select the organization sub-type');
      expect(subTypeSelectDe).toBeTruthy();
      const texts = renderedOptionTexts(subTypeSelectDe!);
      expect(texts).toEqual(['Marmoset National Ministry Distinctive', 'Narwhal Local Government Distinctive']);
    });
  });

  // Design.md §5.2 / Implementation notes: the card never sets, copies, or clears
  // result_institution_type_id; the parent owns identity.
  describe('result_institution_type_id is passed through unchanged', () => {
    it('is preserved across a mutation on the same row', async () => {
      component.organization = { ...new InnovationUseOrganization(), result_institution_type_id: 88, is_organization_known: false };
      fixture.detectChanges();
      const emitSpy = jest.spyOn(component.update, 'emit');

      await component.onInstitutionTypeChange(10);
      fixture.detectChanges();

      const emitted = emitSpy.mock.calls.at(-1)?.[0] as InnovationUseOrganization;
      expect(emitted.result_institution_type_id).toBe(88);
    });
  });
});
