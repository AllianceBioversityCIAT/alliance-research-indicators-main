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
      // §5.5 / Fix 3 (Lens B issue 2): organization_count renders on BOTH identity paths.
      expect(appInputLabelled('Organization count')).toBeTruthy();
    });

    it('unknown path renders the organization-type select and no known-path controls', () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();

      expect(selectByAria('Select the organization type')).toBeTruthy();
      expect(selectByAria('Select the organization')).toBeFalsy();
      expect(fixture.debugElement.query(By.directive(PartnerSelectedItemComponent))).toBeFalsy();
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

  // c4 — No asterisk renders on any field of this card, in any state.
  describe('c4 — zero required-asterisk nodes on this card, in every state', () => {
    it('renders no .text-red-500 node in the known path', () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: true };
      fixture.detectChanges();
      expect(fixture.debugElement.queryAll(By.css('.text-red-500')).length).toBe(0);
    });

    it('renders no .text-red-500 node in the unknown path, including OTHER + sub-type visible', async () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();
      await component.onInstitutionTypeChange(78);
      fixture.detectChanges();
      expect(fixture.debugElement.queryAll(By.css('.text-red-500')).length).toBe(0);
    });
  });

  // c5 — a touched row satisfying neither path shows the message; an untouched row does not.
  describe('c5 — the not-yet-identified message tracks touched, not just unsatisfied', () => {
    it('an untouched, unidentified row shows no message', () => {
      component.organization = new InnovationUseOrganization();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent as string).not.toContain('does not identify an organization yet');
    });

    it('a touched row (count entered) that still identifies no organization shows the message', () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();

      appInputLabelled('Organization count')!.setValue(3);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent as string).toContain('does not identify an organization yet');
      // T-11 c3 — the error is icon AND text, never text alone; only in this @if branch is
      // "unknown path, no identity yet" true, so exactly one material-symbols-rounded warning
      // icon exists in the DOM here.
      const icon = fixture.debugElement.query(By.css('i.material-symbols-rounded'));
      expect(icon).toBeTruthy();
      expect((icon.nativeElement.textContent || '').trim()).toBe('warning');
    });

    it('a touched row that DOES identify an organization shows no message', async () => {
      component.organization = { ...new InnovationUseOrganization(), is_organization_known: false };
      fixture.detectChanges();

      await component.onInstitutionTypeChange(10);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent as string).not.toContain('does not identify an organization yet');
    });
  });

  // c6 — organization_count rejects negatives/fractions via paste and typing; 0 is accepted.
  describe('c6 — organization_count: no negative, no fractional, 0 accepted and distinct from absent', () => {
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

    it('0 is accepted and the emitted row carries 0, not undefined', () => {
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
    it('known path: hides remove, disables checkbox, organization select, count and the request-partner button', async () => {
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

      const inputs = appInputs();
      // Fix 3 (Lens B issue 2): length-guard so this assertion cannot pass vacuously on an
      // empty list — it must actually find the count field and check it.
      expect(inputs.length).toBe(1);
      inputs.forEach(de => expect(inputNumberInside(de).disabled).toBe(true));

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
