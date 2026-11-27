import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AutoComplete } from 'primeng/autocomplete';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ApiService } from '@shared/services/api.service';
import { StaffPickerComponent, StaffPickerPerson } from './staff-picker.component';

// @akili-spec institutional-performance/strategy-framework T-15 — R-STF-004 AC.1–AC.2, NFR-STF-004.
// KZ-015: type into the combobox, advance the debounce, then select and click reorder.
// KZ-017: jsdom cannot prove the focus ring, contrast, or a real Tab into the listbox.

const ok = <T>(data: T): MainResponse<T> =>
  ({ data, status: 200, description: 'ok', timestamp: '', path: '', successfulRequest: true }) as MainResponse<T>;

const IDRIS: StaffPickerPerson = { carnet: 'IJ', name: 'Idris Jones', email: 'ij@alliance.org', isActiveStaff: true };
const PHILIPPE: StaffPickerPerson = { carnet: 'PA', name: 'Philippe Attey', email: 'pa@alliance.org', isActiveStaff: false };

describe('StaffPickerComponent', () => {
  let fixture: ComponentFixture<StaffPickerComponent>;
  let api: { GET_StrategyFrameworkStaff: jest.Mock };
  let originalMatchMedia: PropertyDescriptor | undefined;

  const chips = () => Array.from(fixture.nativeElement.querySelectorAll('[data-testid="staff-chip"]')) as HTMLElement[];
  const input = () => fixture.nativeElement.querySelector('#staffPickerInput') as HTMLInputElement;

  beforeAll(() => {
    // jsdom has no matchMedia; PrimeNG's overlay probes it when the suggestion list opens.
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
    if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', originalMatchMedia);
    else delete (window as Partial<Window>).matchMedia;
  });

  beforeEach(async () => {
    api = { GET_StrategyFrameworkStaff: jest.fn().mockResolvedValue(ok([IDRIS])) };
    await TestBed.configureTestingModule({
      imports: [StaffPickerComponent],
      providers: [provideNoopAnimations(), { provide: ApiService, useValue: api }]
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    document.querySelectorAll('.p-autocomplete-overlay').forEach(node => node.remove());
  });

  const mount = (people: StaffPickerPerson[] = []) => {
    fixture = TestBed.createComponent(StaffPickerComponent);
    fixture.componentRef.setInput('people', people);
    fixture.detectChanges();
  };

  it('labels the combobox, waits 300ms, and does not search under 2 characters', fakeAsync(() => {
    mount();
    const field = input();
    expect(field.getAttribute('role')).toBe('combobox');
    expect(fixture.nativeElement.querySelector('label[for="staffPickerInput"]')?.classList.contains('label')).toBe(true);
    expect(fixture.nativeElement.querySelector('label[for="staffPickerInput"]')?.textContent?.trim()).toBe('Responsibles');
    expect(fixture.nativeElement.querySelector('[data-testid="staff-hint"]')?.classList.contains('ods-field__hint')).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="staff-hint"]')?.textContent).toContain('At least 2 characters');

    field.value = 'I';
    field.dispatchEvent(new Event('input'));
    tick(300);
    expect(api.GET_StrategyFrameworkStaff).not.toHaveBeenCalled();

    field.value = 'Id';
    field.dispatchEvent(new Event('input'));
    tick(299);
    expect(api.GET_StrategyFrameworkStaff).not.toHaveBeenCalled();
    tick(1);
    expect(api.GET_StrategyFrameworkStaff).toHaveBeenCalledTimes(1);
    expect(api.GET_StrategyFrameworkStaff).toHaveBeenCalledWith('Id');
  }));

  it('adds only a server hit, with name and email, and never a typed string', fakeAsync(() => {
    api.GET_StrategyFrameworkStaff.mockResolvedValue(
      ok([IDRIS, { carnet: 'OLD', name: 'Old Staff', email: 'old@alliance.org', isActiveStaff: false }])
    );
    mount();
    const field = input();
    field.value = 'Id';
    field.dispatchEvent(new Event('input'));
    tick(300);
    fixture.detectChanges();

    const auto = fixture.debugElement.query(By.directive(AutoComplete)).componentInstance as AutoComplete;
    const offered = (auto.suggestions ?? []) as StaffPickerPerson[];
    expect(offered.map(person => person.name)).toEqual(['Idris Jones']);

    auto.onOptionSelect(new Event('click'), IDRIS);
    fixture.detectChanges();
    expect(chips().map(chip => chip.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['Idris Jones ij@alliance.org']);

    auto.onOptionSelect(new Event('click'), { carnet: 'ZZ', name: 'Not On The Server', email: 'no@alliance.org' });
    fixture.detectChanges();
    expect(chips().map(chip => chip.textContent)).not.toEqual(expect.arrayContaining([expect.stringContaining('Not On The Server')]));

    field.value = 'Nope';
    field.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(chips()).toHaveLength(1);
    expect(chips()[0].textContent).not.toContain('Nope');
  }));

  it('tags an inactive responsible and reorders with labelled buttons', () => {
    mount([IDRIS, PHILIPPE]);

    const inactive = fixture.nativeElement.querySelector('[data-testid="staff-inactive"]');
    expect(inactive?.textContent?.trim()).toBe('inactive');
    expect(chips()[0].querySelector('.staff-picker__identity')?.getAttribute('title')).toBe('Idris Jones ij@alliance.org');
    expect(chips()[1].querySelector('.staff-picker__identity')?.getAttribute('title')).toBe('Philippe Attey pa@alliance.org');
    expect(chips()[1].textContent).toContain('Philippe Attey');
    expect(fixture.nativeElement.querySelector('[aria-label="Move Idris Jones up"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Move Philippe Attey down"]')).not.toBeNull();

    (fixture.nativeElement.querySelector('[aria-label="Move Idris Jones down"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(chips()[0].textContent).toContain('Philippe Attey');
    expect(chips()[1].textContent).toContain('Idris Jones');
    expect(chips()[0].querySelector('[data-testid="staff-inactive"]')).not.toBeNull();
  });
});
