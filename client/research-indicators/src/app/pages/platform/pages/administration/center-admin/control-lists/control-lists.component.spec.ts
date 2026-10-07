import { Component, Input, WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Select } from 'primeng/select';
import ControlListsComponent from './control-lists.component';
import { Portfolio } from '@shared/interfaces/portfolio.interface';
import {
  ControlList,
  ControlListCategory,
  ControlListPortfolioSummary,
  ControlListSummary,
  ControlListValue
} from '@shared/interfaces/control-lists.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ApiService } from '@shared/services/api.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { ActionsService } from '@shared/services/actions.service';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { TextareaComponent } from '@shared/components/custom-fields/textarea/textarea.component';
import { CustomProgressBarComponent } from '@shared/components/custom-progress-bar/custom-progress-bar.component';

@Component({ selector: 'app-modal', standalone: true, template: '<ng-content></ng-content>' })
class ModalStubComponent {
  @Input() modalName = '';
  @Input() clearModal: () => void = () => undefined;
}

// T-02 (KZ-001): a real native <input [disabled]> so the "key input is disabled in edit mode"
// falsifier asserts on RENDERED DOM, not just the component's `disabled` instance property —
// an empty-template stub (T-01's original) would make that assertion vacuous.
// Code-prefix-on-edit (follow-up) adds a `[value]` binding from the backing signal for the same
// reason: "shows the list's real prefix" must be asserted on the rendered input, not just on
// `component.listForm()`.
@Component({ selector: 'app-input', standalone: true, template: '<input [disabled]="disabled" [value]="signal()[optionValue]" />' })
class InputStubComponent {
  @Input() signal!: WritableSignal<Record<string, unknown>>;
  @Input() optionValue = '';
  @Input() label = '';
  @Input() placeholder = '';
  @Input() isRequired = false;
  @Input() maxLength?: number;
  @Input() disabled = false;
}

@Component({ selector: 'app-textarea', standalone: true, template: '' })
class TextareaStubComponent {
  @Input() signal!: WritableSignal<Record<string, unknown>>;
  @Input() optionValue = '';
  @Input() label = '';
  @Input() placeholder = '';
  @Input() isRequired = false;
  @Input() rows = 10;
  @Input() maxLength = 40000;
}

@Component({ selector: 'app-custom-progress-bar', standalone: true, template: '<div data-testid="progress-bar"></div>' })
class ProgressBarStubComponent {}

// Wide, non-adjacent ranges so "today" (whenever the suite runs) always resolves to
// portfolio2 as the default, with no boundary ambiguity (unlike an exact-year edge).
const portfolio1: Portfolio = { id: 1, name: 'Alliance 2010-2015', description: 'Legacy', start_year: 2000, end_year: 2015 };
const portfolio2: Portfolio = { id: 2, name: 'Alliance 2026-2030', description: 'Current', start_year: 2016, end_year: 2099 };

const category = (overrides: Partial<ControlListCategory> = {}): ControlListCategory => ({
  id: 1,
  portfolioId: 2,
  name: 'Key Performance Indicators (KPIs)',
  description: null,
  displayOrder: 0,
  lists: [],
  ...overrides
});

// T-02 — design §4 A1 "lists: ListSummary[]" (id, key, name, value count, is_system, usedBy).
// `codePrefix` (D-CTL-17, T-03 rework): defaults to 'DIR', the seeded prefix for `kpi.direction`
// (R-CTL-010 / tasks.md T-02 seed: UOM/DIR/FRQ/KLV/KTY/L).
const listSummary = (overrides: Partial<ControlListSummary> = {}): ControlListSummary => ({
  id: 10,
  key: 'kpi.direction',
  name: 'Direction',
  description: 'Whether a higher, lower or stable value is the goal.',
  valueCount: 3,
  isSystem: true,
  usedBy: [],
  codePrefix: 'DIR',
  ...overrides
});

// KZ-015 transition fixture: reviewer FAIL (T-02 rework) — this literally mirrors the server's
// `ControlListResponse` (`control-lists.types.ts`): `key`, never `listKey`, and `codePrefix` is
// always a `string` (NOT NULL column with a derived default — `deriveDefaultCodePrefix()` in
// `control-lists.service.ts`), never `null`.
const controlList = (overrides: Partial<ControlList> = {}): ControlList => ({
  id: 20,
  portfolioId: 2,
  categoryId: 1,
  key: 'kpi.custom',
  name: 'Custom list',
  description: null,
  codePrefix: 'KPICUSTOM',
  isSystem: false,
  ...overrides
});

// T-03/T-04 — design §4 A9–A12. Mirrors the client-side `ControlListValue` interface, which in
// turn mirrors the server's `ControlListValueResponse` (see that interface's own doc comment).
// `inUse` defaults to 0 (not in use) — T-04 made it a REQUIRED field (A9 always sends it).
const controlListValue = (overrides: Partial<ControlListValue> = {}): ControlListValue => ({
  id: 101,
  listId: 10,
  code: 'DIR-01',
  value: 'Increase',
  description: null,
  displayOrder: 1,
  isActive: true,
  inUse: 0,
  ...overrides
});

function ok<T>(data: T): MainResponse<T> {
  return {
    data,
    status: 200,
    description: 'OK',
    timestamp: new Date().toISOString(),
    path: '/api/control-lists',
    successfulRequest: true,
    errorDetail: { errors: '', detail: '', description: '' }
  };
}

/**
 * The real `GlobalExceptions` shape (Leader's server error contract, global.exception.ts:21-29):
 * `description` is ALWAYS the exception CLASS NAME ("ConflictException") — reading it as a
 * message is exactly reviewer finding 1 — and the actual text lives in `errorDetail.errors`,
 * which arrives as one of three shapes:
 *   - a field-named object `{ description, field }` (ConflictException, e.g. duplicate name —
 *     control-lists.service.ts `throwDuplicateNameConflict`);
 *   - a plain string (a conflict with no single offending field, e.g. a blocked delete);
 *   - an array of strings (400 ValidationPipe).
 * An attempt-1 fixture put the message in `errorDetail.description` instead, which hid the
 * `extractErrorMessage` bug the Reviewer caught — this helper never does that.
 */
type RawErrors = string | string[] | { description?: string; field?: string };

function fail(status: number, errors: RawErrors, exceptionName = 'ConflictException'): MainResponse<unknown> {
  return {
    data: undefined,
    status,
    description: exceptionName,
    timestamp: new Date().toISOString(),
    path: '/api/control-lists',
    successfulRequest: false,
    errorDetail: { errors, detail: '', description: exceptionName } as unknown as MainResponse<unknown>['errorDetail']
  };
}

describe('ControlListsComponent', () => {
  let fixture: ComponentFixture<ControlListsComponent>;
  let component: ControlListsComponent;
  let modalConfig: ReturnType<typeof signal<Record<string, any>>>;
  let modals: { modalConfig: typeof modalConfig; openModal: jest.Mock; closeModal: jest.Mock };
  let actions: { showToast: jest.Mock; showGlobalAlert: jest.Mock };

  const api = {
    GET_Portfolios: jest.fn(),
    GET_ControlListPortfolioSummaries: jest.fn(),
    GET_ControlListCategories: jest.fn(),
    POST_ControlListCategory: jest.fn(),
    PATCH_ControlListCategory: jest.fn(),
    DELETE_ControlListCategory: jest.fn(),
    // T-02 (A6–A8)
    POST_ControlList: jest.fn(),
    PATCH_ControlList: jest.fn(),
    DELETE_ControlList: jest.fn(),
    // T-03 (A9–A12)
    GET_ControlListValues: jest.fn(),
    POST_ControlListValue: jest.fn(),
    PATCH_ControlListValue: jest.fn(),
    DELETE_ControlListValue: jest.fn()
  };

  const summaries: ControlListPortfolioSummary[] = [
    { portfolioId: 1, categories: 0 },
    { portfolioId: 2, categories: 1 }
  ];

  async function setup(categoriesForPortfolio2: ControlListCategory[] = [category()]): Promise<void> {
    modalConfig = signal<Record<string, any>>({ controlListForm: { isOpen: false, title: 'New category' } });
    modals = {
      modalConfig,
      openModal: jest.fn((name: string) => modalConfig.update(current => ({ ...current, [name]: { ...current[name], isOpen: true } }))),
      closeModal: jest.fn((name: string) => modalConfig.update(current => ({ ...current, [name]: { ...current[name], isOpen: false } })))
    };
    actions = { showToast: jest.fn(), showGlobalAlert: jest.fn() };

    jest.clearAllMocks();
    api.GET_Portfolios.mockResolvedValue(ok([portfolio1, portfolio2]));
    api.GET_ControlListPortfolioSummaries.mockResolvedValue(ok(summaries));
    api.GET_ControlListCategories.mockImplementation((portfolioId: number) =>
      Promise.resolve(ok(portfolioId === 2 ? categoriesForPortfolio2 : []))
    );
    api.POST_ControlListCategory.mockResolvedValue(ok(category()));
    api.PATCH_ControlListCategory.mockResolvedValue(ok(category()));
    api.DELETE_ControlListCategory.mockResolvedValue(ok({ id: 1 }));
    api.POST_ControlList.mockResolvedValue(ok(controlList()));
    api.PATCH_ControlList.mockResolvedValue(ok(controlList()));
    api.DELETE_ControlList.mockResolvedValue(ok({ id: 20 }));
    api.GET_ControlListValues.mockResolvedValue(ok([]));
    api.POST_ControlListValue.mockResolvedValue(ok(controlListValue()));
    api.PATCH_ControlListValue.mockResolvedValue(ok(controlListValue()));
    api.DELETE_ControlListValue.mockResolvedValue(ok({ id: 101 }));

    await TestBed.configureTestingModule({
      imports: [ControlListsComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ApiService, useValue: api as unknown as ApiService },
        { provide: AllModalsService, useValue: modals as unknown as AllModalsService },
        { provide: ActionsService, useValue: actions as unknown as ActionsService }
      ]
    })
      .overrideComponent(ControlListsComponent, {
        remove: { imports: [ModalComponent, InputComponent, TextareaComponent, CustomProgressBarComponent] },
        add: { imports: [ModalStubComponent, InputStubComponent, TextareaStubComponent, ProgressBarStubComponent] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(ControlListsComponent);
    component = fixture.componentInstance;
    // KZ-015: construct in the initial state (loading=true, nothing resolved yet)
    // before the first detectChanges, then let ngOnInit's async load() settle.
    // load() is TWO promise-chain levels deep (Promise.all, then loadCategories'
    // own await) — a single whenStable() only flushes the first level, so this
    // needs a second round-trip before the fixture is truly idle.
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  // ─── Default portfolio + "not configured" (R-CTL-001, falsifier 6) ────────────

  it('resolves the portfolio whose years contain today as the default, and loads its categories', async () => {
    await setup();

    expect(component.selectedPortfolioId()).toBe(2);
    expect(api.GET_ControlListCategories).toHaveBeenCalledWith(2);
    expect(component.categories()).toHaveLength(1);
    expect(component.loading()).toBe(false);
    expect(component.loadError()).toBe(false);
  });

  // Unit-level check of the derived data only. It does NOT gate falsifier 6 (a mutation to the
  // RENDERED `p-select` — see the dedicated describe block below) because it reads
  // `portfolioOptions()` and drives `selectPortfolio()` directly, bypassing the select entirely
  // (reviewer finding 2).
  it('computes configured=false and the "(not configured)" label for a 0-category portfolio, true/no suffix otherwise', async () => {
    await setup();

    const options = component.portfolioOptions();
    const p1 = options.find(option => option.portfolioIdValue === 1);
    const p2 = options.find(option => option.portfolioIdValue === 2);
    expect(p1?.configured).toBe(false);
    expect(p1?.displayLabel).toBe('Alliance 2010-2015 (not configured)');
    expect(p2?.configured).toBe(true);
    expect(p2?.displayLabel).toBe('Alliance 2026-2030');

    await component.selectPortfolio(1);

    expect(api.GET_ControlListCategories).toHaveBeenCalledWith(1);
    expect(component.selectedPortfolioId()).toBe(1);
    expect(component.categories()).toEqual([]);
  });

  it('shows the empty state with + New category for a 0-category portfolio', async () => {
    await setup();
    await component.selectPortfolio(1);
    fixture.detectChanges();

    const empty = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="empty-state"]');
    expect(empty).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="empty-new-category-button"]')).toBeTruthy();
  });

  it('does not reload when the same portfolio is selected again', async () => {
    await setup();
    api.GET_ControlListCategories.mockClear();

    await component.selectPortfolio(2);

    expect(api.GET_ControlListCategories).not.toHaveBeenCalled();
  });

  // ─── Falsifier 6, run against the RENDERED p-select (reviewer finding 2) ──────
  //
  // Attempt 1's falsifier-6 test drove `component.portfolioOptions()` and
  // `component.selectPortfolio()` directly, so the mutation the spec actually names — binding
  // `optionDisabled="disabled"` on the `p-select` with `disabled: !configured` added to each
  // option — left it green. This block opens the real PrimeNG overlay and asserts on the
  // rendered option (KZ-001).
  describe('rendered portfolio selector overlay', () => {
    let originalMatchMedia: PropertyDescriptor | undefined;

    beforeAll(() => {
      // jsdom has no matchMedia; PrimeNG's Overlay probes it when the panel opens.
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

    afterEach(() => {
      // The overlay is appended to document.body — drop any leftovers so DOM queries in the
      // next test never see a stale instance from this one.
      document.body.querySelectorAll('.p-select-overlay, .p-overlay').forEach(el => el.remove());
    });

    function portfolioSelect(): Select {
      const selectDe = fixture.debugElement
        .queryAll(By.directive(Select))
        .find(de => (de.nativeElement as HTMLElement).getAttribute('data-testid') === 'portfolio-select');
      expect(selectDe).toBeDefined();
      return selectDe!.componentInstance as Select;
    }

    it('keeps the 0-category portfolio option enabled in the rendered overlay, and clicking it loads the empty state (falsifier 6)', async () => {
      await setup();

      const select = portfolioSelect();
      select.show();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const renderedOptions = Array.from(document.body.querySelectorAll('.p-select-option'));
      expect(renderedOptions.length).toBe(2);
      const notConfigured = renderedOptions.find(el => el.textContent?.includes('(not configured)')) as HTMLElement | undefined;
      expect(notConfigured).toBeTruthy();

      // The exact DOM the "disable 0-category portfolios" mutation would flip
      // (SelectItem's template: `[ngClass]="{ 'p-disabled': disabled }"` +
      // `[attr.data-p-disabled]="disabled"` — primeng-select.mjs:962-975).
      expect(notConfigured!.classList.contains('p-disabled')).toBe(false);
      expect(notConfigured!.getAttribute('data-p-disabled')).not.toBe('true');

      notConfigured!.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(api.GET_ControlListCategories).toHaveBeenCalledWith(1);
      expect(component.selectedPortfolioId()).toBe(1);
      expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="empty-state"]')).toBeTruthy();
    });
  });

  // ─── Loading / error / success states (R-CTL-008) ─────────────────────────────

  it('sets loadError when portfolios cannot be loaded', async () => {
    jest.clearAllMocks();
    // A synchronous throw (not mockRejectedValueOnce) — caught at the `await` call
    // site itself, with no separately-constructed rejected Promise to leak as an
    // unhandled rejection into a later test (same technique as portfolio-management
    // .component.spec.ts's "sets load error" case).
    api.GET_Portfolios.mockImplementationOnce(() => {
      throw new Error('network down');
    });
    api.GET_ControlListPortfolioSummaries.mockResolvedValue(ok(summaries));

    await TestBed.configureTestingModule({
      imports: [ControlListsComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ApiService, useValue: api as unknown as ApiService },
        { provide: AllModalsService, useValue: { modalConfig: signal({ controlListForm: { isOpen: false, title: '' } }), openModal: jest.fn(), closeModal: jest.fn() } as unknown as AllModalsService },
        { provide: ActionsService, useValue: { showToast: jest.fn(), showGlobalAlert: jest.fn() } as unknown as ActionsService }
      ]
    })
      .overrideComponent(ControlListsComponent, {
        remove: { imports: [ModalComponent, InputComponent, TextareaComponent, CustomProgressBarComponent] },
        add: { imports: [ModalStubComponent, InputStubComponent, TextareaStubComponent, ProgressBarStubComponent] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(ControlListsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.loadError()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="error-state"]')).toBeTruthy();
  });

  // ─── Category CRUD against real MainResponse shapes ───────────────────────────

  it('creates a category, shows a success toast, and reloads the list', async () => {
    await setup([]);

    component.startCreate();
    expect(modals.openModal).toHaveBeenCalledWith('controlListForm');
    component.form.set({ name: 'Key Performance Indicators (KPIs)', description: 'KPI lists' });

    await component.save();

    expect(api.POST_ControlListCategory).toHaveBeenCalledWith({
      portfolioId: 2,
      name: 'Key Performance Indicators (KPIs)',
      description: 'KPI lists'
    });
    expect(actions.showToast).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'Control Lists',
      detail: 'Category created successfully'
    });
    expect(modals.closeModal).toHaveBeenCalledWith('controlListForm');
    expect(component.form().name).toBe('');
    expect(api.GET_ControlListCategories).toHaveBeenCalledTimes(2); // initial load + reload after save
    expect(api.GET_ControlListPortfolioSummaries).toHaveBeenCalledTimes(2); // initial load + refresh after save
  });

  // ─── A2 staleness fix (reviewer finding 3 / design D-CTL-10) ───────────────────

  it('refreshes the portfolio summaries after a successful create, so the "(not configured)" label is not stale', async () => {
    await setup([]);
    await component.selectPortfolio(1);
    expect(component.portfolioOptions().find(option => option.portfolioIdValue === 1)?.displayLabel).toBe(
      'Alliance 2010-2015 (not configured)'
    );

    api.GET_ControlListPortfolioSummaries.mockClear();
    api.GET_ControlListPortfolioSummaries.mockResolvedValueOnce(
      ok<ControlListPortfolioSummary[]>([
        { portfolioId: 1, categories: 1 },
        { portfolioId: 2, categories: 1 }
      ])
    );

    component.startCreate();
    component.form.set({ name: 'Key Performance Indicators (KPIs)', description: '' });
    await component.save();

    expect(api.GET_ControlListPortfolioSummaries).toHaveBeenCalledTimes(1);
    expect(component.portfolioOptions().find(option => option.portfolioIdValue === 1)?.displayLabel).toBe('Alliance 2010-2015');
  });

  it('edits a category and calls PATCH with the category id', async () => {
    const existing = category({ id: 7, name: 'KPIs' });
    await setup([existing]);

    component.startEdit(existing);
    expect(component.isEditing()).toBe(true);
    expect(modalConfig()['controlListForm'].title).toBe('Edit category');
    component.form.update(current => ({ ...current, name: 'Updated name' }));

    await component.save();

    // `existing.description` is null -> startEdit() seeds the form with '' -> trimmed stays ''.
    // PATCH must send '' here (not `undefined`), same Leader-adjudicated rule as the dedicated
    // "clears a description" test below — this one just pins the already-empty case.
    expect(api.PATCH_ControlListCategory).toHaveBeenCalledWith(7, { name: 'Updated name', description: '' });
  });

  // Leader-adjudicated defect: `description: undefined` is dropped by JSON.stringify, so a PATCH
  // meant to clear a description silently left the old value in place while the UI reported
  // success. Observed RED against the pre-fix code (`value.description.trim() || undefined` on
  // both create and edit) before this fix — PATCH sent `description: undefined` instead of ''.
  it('clears a category description on edit when the field is emptied (PATCH sends empty string, not undefined)', async () => {
    const existing = category({ id: 7, name: 'KPIs', description: 'Old description' });
    await setup([existing]);

    component.startEdit(existing);
    expect(component.form().description).toBe('Old description');
    component.form.update(current => ({ ...current, description: '' }));

    await component.save();

    expect(api.PATCH_ControlListCategory).toHaveBeenCalledWith(7, { name: 'KPIs', description: '' });
  });

  it('does not save an invalid (blank name) or already-saving form', async () => {
    await setup();

    await component.save();
    expect(api.POST_ControlListCategory).not.toHaveBeenCalled();

    component.form.set({ name: 'Valid name', description: '' });
    component.saving.set(true);
    await component.save();
    expect(api.POST_ControlListCategory).not.toHaveBeenCalled();
  });

  // ─── A server 409 is shown AS-IS (design §6.2) ─────────────────────────────────

  it('shows a field-named 409 duplicate-name error INLINE under the name input, never as a toast and never the exception class name (reviewer finding 1)', async () => {
    await setup([]);
    const message = 'A category named "Key Performance Indicators (KPIs)" already exists in this portfolio';
    // Real GlobalExceptions shape: errorDetail.errors = { description, field: 'name' }.
    // `description` here is "ConflictException" (the exception class) — extractErrorMessage
    // must never read it, only `errorDetail.errors`.
    api.POST_ControlListCategory.mockResolvedValueOnce(fail(409, { description: message, field: 'name' }));
    component.form.set({ name: 'Key Performance Indicators (KPIs)', description: '' });

    await component.save();
    fixture.detectChanges();

    expect(component.nameFieldError()).toBe(message);
    const inline = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="name-field-error"]');
    expect(inline?.textContent?.trim()).toBe(message);
    // never a toast for a field error, and never the exception class name anywhere
    expect(actions.showToast).not.toHaveBeenCalled();
    expect(inline?.textContent).not.toContain('ConflictException');
    // the failed save must not be read as success: modal stays open, nothing reset to "created"
    expect(modals.closeModal).not.toHaveBeenCalledWith('controlListForm');
  });

  it('falls back to a toast (never the exception class name) for a 409 with no field, e.g. a race at the unique index', async () => {
    await setup([]);
    const message = 'A category with this name was just created by someone else';
    api.POST_ControlListCategory.mockResolvedValueOnce(fail(409, { description: message }));
    component.form.set({ name: 'Key Performance Indicators (KPIs)', description: '' });

    await component.save();

    expect(actions.showToast).toHaveBeenCalledWith({ severity: 'error', summary: 'Error', detail: message });
    expect(component.nameFieldError()).toBeNull();
  });

  it('shows a 404 (unknown portfolio) as-is — `errors` is a PLAIN STRING here, a third shape alongside the 409 object and 400 array', async () => {
    // Server contract update (coordinator, parallel server worker — A3's 404 for a since-deleted
    // portfolio): NotFoundException's body is `{ description: 'NotFoundException', status: 404,
    // errors: 'Portfolio 999 not found', timestamp, path }` — `errors` is a bare string, not the
    // `{ description, field }` shape 409 uses. extractFieldError's string branch must carry this.
    await setup([]);
    const message = 'Portfolio 999 not found';
    api.POST_ControlListCategory.mockResolvedValueOnce(fail(404, message, 'NotFoundException'));
    component.form.set({ name: 'Key Performance Indicators (KPIs)', description: '' });

    await component.save();

    expect(actions.showToast).toHaveBeenCalledWith({ severity: 'error', summary: 'Error', detail: message });
    expect(component.nameFieldError()).toBeNull();
  });

  it('clears a stale inline name error when a different category modal is opened next (startEdit)', async () => {
    const existing = category({ id: 5, name: 'KPIs' });
    await setup([existing]);
    api.POST_ControlListCategory.mockResolvedValueOnce(fail(409, { description: 'dup', field: 'name' }));
    component.startCreate();
    component.form.set({ name: 'KPIs', description: '' });
    await component.save();
    expect(component.nameFieldError()).toBe('dup');

    component.startEdit(existing);

    expect(component.nameFieldError()).toBeNull();
  });

  // ─── Delete: confirm flow + blocked (409, has lists) shown AS-IS ───────────────

  it('asks for confirmation before deleting, and deletes on Continue', async () => {
    const existing = category({ id: 3, name: 'Empty category' });
    await setup([existing]);

    component.delete(existing);

    expect(api.DELETE_ControlListCategory).not.toHaveBeenCalled();
    expect(actions.showGlobalAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warning',
        summary: 'Delete category',
        confirmCallback: expect.objectContaining({ label: 'Continue' }),
        cancelCallback: expect.objectContaining({ label: 'Cancel' })
      })
    );

    const alertConfig = actions.showGlobalAlert.mock.calls[0][0];
    alertConfig.confirmCallback.event();
    await fixture.whenStable();
    await fixture.whenStable();

    expect(api.DELETE_ControlListCategory).toHaveBeenCalledWith(3);
    expect(actions.showToast).toHaveBeenCalledWith({
      severity: 'success',
      summary: 'Control Lists',
      detail: 'Category deleted successfully'
    });
    expect(component.deletingId()).toBeNull();
  });

  it('refreshes the portfolio summaries after a successful delete, so the "(not configured)" label reflects 0 categories again', async () => {
    const existing = category({ id: 11, portfolioId: 1, name: 'Only category' });
    await setup([category()]);
    // Force portfolio 1 into a "has 1 category" state without a network round trip —
    // GET_ControlListPortfolioSummaries is asserted on its OWN call count below.
    component.portfolioSummaries.set([
      { portfolioId: 1, categories: 1 },
      { portfolioId: 2, categories: 1 }
    ]);
    component.selectedPortfolioId.set(1);
    component.categories.set([existing]);
    expect(component.portfolioOptions().find(option => option.portfolioIdValue === 1)?.displayLabel).toBe('Alliance 2010-2015');

    api.GET_ControlListPortfolioSummaries.mockClear();
    api.GET_ControlListPortfolioSummaries.mockResolvedValueOnce(
      ok<ControlListPortfolioSummary[]>([
        { portfolioId: 1, categories: 0 },
        { portfolioId: 2, categories: 1 }
      ])
    );

    component.delete(existing);
    const alertConfig = actions.showGlobalAlert.mock.calls[actions.showGlobalAlert.mock.calls.length - 1][0];
    alertConfig.confirmCallback.event();
    await fixture.whenStable();
    await fixture.whenStable();

    expect(api.GET_ControlListPortfolioSummaries).toHaveBeenCalledTimes(1);
    expect(component.portfolioOptions().find(option => option.portfolioIdValue === 1)?.displayLabel).toBe(
      'Alliance 2010-2015 (not configured)'
    );
  });

  it('shows a blocked (409, has lists) delete AS-IS behind a single Close, and does not toast success', async () => {
    const existing = category({ id: 4, name: 'Organizational structure' });
    await setup([existing]);
    // No single offending field here (it is a category-has-lists conflict, not a column
    // conflict), so `errors` is the field-less object form — still never `errorDetail.description`.
    api.DELETE_ControlListCategory.mockResolvedValueOnce(
      fail(409, { description: 'This category still has 1 list. Remove its lists first.' })
    );

    component.delete(existing);
    const alertConfig = actions.showGlobalAlert.mock.calls[0][0];
    alertConfig.confirmCallback.event();
    await fixture.whenStable();
    await fixture.whenStable();

    expect(actions.showGlobalAlert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Cannot delete category',
        detail: 'This category still has 1 list. Remove its lists first.',
        hasNoCancelButton: true,
        generalButton: true,
        confirmCallback: expect.objectContaining({ label: 'Close' })
      })
    );
    expect(actions.showToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ detail: 'Category deleted successfully' })
    );
  });

  // ─── Navigator a11y (NFR-CTL-004) ───────────────────────────────────────────────

  it('renders edit and delete icon buttons with an aria-label per category', async () => {
    await setup([category({ id: 9, name: 'KPIs' })]);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[aria-label="Edit KPIs"]')).toBeTruthy();
    expect(el.querySelector('[aria-label="Delete KPIs"]')).toBeTruthy();
  });

  it('clearModal resets the form and editing state', async () => {
    await setup([category({ id: 9, name: 'KPIs' })]);
    component.startEdit(category({ id: 9, name: 'KPIs' }));

    component.clearModal();

    expect(component.isEditing()).toBe(false);
    expect(component.form().name).toBe('');
  });

  // ─── T-02: Lists — navigator, list header, modal list mode (design §4 A6–A8, §6.2) ─────────

  describe('lists', () => {
    const directionList = listSummary({ id: 10, key: 'kpi.direction', name: 'Direction', isSystem: true });
    const customList = listSummary({ id: 11, key: 'kpi.custom', name: 'Custom list', description: null, isSystem: false, valueCount: 0 });
    const kpiCategory = category({ id: 1, name: 'KPIs', lists: [directionList, customList] });
    const emptyCategory = category({ id: 2, name: 'Organizational structure', lists: [] });

    // J-11 / falsifier 7: a category with 0 lists shows its empty state with + Add list.
    it('shows the empty state with + Add list for a category with 0 lists (J-11)', async () => {
      await setup([emptyCategory]);

      const row = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="category-row"]')!;
      expect(row.querySelector('[data-testid="category-empty-lists"]')).toBeTruthy();
      const addListButton = row.querySelector('[data-testid="add-list-empty-button"]');
      expect(addListButton).toBeTruthy();
      expect(addListButton?.textContent).toContain('Add list');
      // nothing renders for the (absent) list-list in this state
      expect(row.querySelector('[data-testid="list-list"]')).toBeFalsy();
    });

    it('renders a list-row per list, with its value count, under a non-empty category', async () => {
      await setup([kpiCategory]);

      const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="list-row"]');
      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('Direction');
      expect(rows[0].textContent).toContain('3');
    });

    // "selecting a list updates the header" + "the reference reads P2 · kpi.direction"
    it('selecting a list updates the header, showing its name, description and the qualified reference', async () => {
      await setup([kpiCategory]);
      expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="list-detail-empty"]')).toBeTruthy();

      component.selectList(directionList.id);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[data-testid="list-detail-empty"]')).toBeFalsy();
      expect(el.querySelector('[data-testid="list-header-name"]')?.textContent?.trim()).toBe('Direction');
      expect(el.querySelector('[data-testid="list-header-description"]')?.textContent?.trim()).toBe(directionList.description);
      expect(el.querySelector('[data-testid="list-header-reference"]')?.textContent?.trim()).toBe('P2 · kpi.direction');
    });

    // ─── T-04: "Used by" (design §4 A1 "usedBy", §5 rule 5, R-CTL-003 "Used by") ─────────────

    // Falsifier (b): a fixture where `usedBy` is already non-empty cannot prove the fallback
    // text appears when it is empty — `directionList`'s default (`listSummary()`) IS `[]`.
    it('shows "Not linked to a form yet" in the list header when usedBy is empty (falsifier b)', async () => {
      await setup([kpiCategory]);

      component.selectList(directionList.id);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[data-testid="list-header-used-by"]')?.textContent?.trim()).toBe('Not linked to a form yet');
    });

    it('shows the joined consumer names in the list header "Used by" line when usedBy is populated', async () => {
      const usedList = listSummary({
        id: 13,
        key: 'org.level',
        name: 'Organizational level',
        isSystem: true,
        usedBy: ['Organizational Structure › Level']
      });
      const orgCategory = category({ id: 1, name: 'Organizational structure', lists: [usedList] });
      await setup([orgCategory]);

      component.selectList(usedList.id);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[data-testid="list-header-used-by"]')?.textContent?.trim()).toBe('Organizational Structure › Level');
    });

    it('joins MULTIPLE consumer names in the "Used by" line (not just the first)', async () => {
      const usedList = listSummary({
        id: 14,
        key: 'kpi.unit_of_measure',
        name: 'Unit of measure',
        isSystem: true,
        usedBy: ['Organizational Structure › Level', 'Strategy Framework › KPI']
      });
      const kpiUomCategory = category({ id: 1, name: 'KPIs', lists: [usedList] });
      await setup([kpiUomCategory]);

      component.selectList(usedList.id);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[data-testid="list-header-used-by"]')?.textContent?.trim()).toBe(
        'Organizational Structure › Level, Strategy Framework › KPI'
      );
    });

    // Clicking the rendered row (not calling selectList() directly) — KZ-001.
    it('clicking a rendered list row selects it and updates the header', async () => {
      await setup([kpiCategory]);

      const row = (fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="list-row"]')[0] as HTMLButtonElement;
      row.click();
      fixture.detectChanges();

      expect(component.selectedListId()).toBe(directionList.id);
      expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="list-header-name"]')?.textContent?.trim()).toBe(
        'Direction'
      );
    });

    // CR-2 / D-CTL-18: any list, seeded or created, can be deleted once empty, so Delete list
    // shows on every list. Restoring the `!isSystem` guard must fail this.
    it('shows Delete list for a seeded (system) list and for a custom list', async () => {
      await setup([kpiCategory]);
      const el = fixture.nativeElement as HTMLElement;

      component.selectList(directionList.id);
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="delete-list-button"]')).toBeTruthy();
      expect(el.querySelector('[data-testid="edit-list-button"]')).toBeTruthy();

      component.selectList(customList.id);
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="delete-list-button"]')).toBeTruthy();
    });

    // "the key input is disabled in edit mode" — asserted on the RENDERED native input, not
    // `component.listForm()` alone (KZ-001).
    it('disables the key input in edit mode, and leaves it enabled on create', async () => {
      await setup([kpiCategory]);
      const el = fixture.nativeElement as HTMLElement;

      component.selectList(directionList.id);
      component.startEditList();
      fixture.detectChanges();
      const editInput = el.querySelector('[data-testid="list-key-field"] input') as HTMLInputElement;
      expect(editInput.disabled).toBe(true);
      // the value is still shown, just not editable
      expect(component.listForm().listKey).toBe('kpi.direction');

      component.clearModal();
      component.startCreateList(kpiCategory);
      fixture.detectChanges();
      const createInput = el.querySelector('[data-testid="list-key-field"] input') as HTMLInputElement;
      expect(createInput.disabled).toBe(false);
    });

    // Follow-up to T-02: Code prefix was hidden entirely on edit. It must now show — disabled,
    // pre-filled with the list's real prefix — same treatment as System key above (KZ-001: asserted
    // on the rendered native input, not just `component.listForm()`).
    it('shows the Code prefix input on edit, disabled, pre-filled with the list\'s real prefix', async () => {
      await setup([kpiCategory]);
      const el = fixture.nativeElement as HTMLElement;

      // directionList's codePrefix defaults to 'DIR' (listSummary() default).
      component.selectList(directionList.id);
      component.startEditList();
      fixture.detectChanges();

      const editInput = el.querySelector('[data-testid="list-code-prefix-field"] input') as HTMLInputElement;
      expect(editInput).toBeTruthy();
      expect(editInput.disabled).toBe(true);
      expect(editInput.value).toBe('DIR');
      expect(component.listForm().codePrefix).toBe('DIR');
    });

    it('shows the Code prefix input enabled and empty on create', async () => {
      await setup([kpiCategory]);
      const el = fixture.nativeElement as HTMLElement;

      component.startCreateList(kpiCategory);
      fixture.detectChanges();

      const createInput = el.querySelector('[data-testid="list-code-prefix-field"] input') as HTMLInputElement;
      expect(createInput).toBeTruthy();
      expect(createInput.disabled).toBe(false);
      expect(createInput.value).toBe('');
    });

    // The server's A7 update DTO (`forbidNonWhitelisted`) accepts only name/description/categoryId —
    // codePrefix must never ride along on a PATCH, same rule already proven for listKey above.
    it('edits a list and never sends codePrefix (or listKey) in the PATCH body', async () => {
      await setup([kpiCategory]);

      component.selectList(directionList.id);
      component.startEditList();
      component.listForm.update(current => ({ ...current, name: 'Renamed direction' }));

      await component.saveList();

      const [, patchBody] = api.PATCH_ControlList.mock.calls[0];
      expect(Object.keys(patchBody).sort()).toEqual(['description', 'name']);
      expect(patchBody).not.toHaveProperty('codePrefix');
      expect(patchBody).not.toHaveProperty('listKey');
    });

    it('creates a list preselecting the category whose "add list" icon was used', async () => {
      await setup([kpiCategory]);

      component.startCreateList(kpiCategory);
      expect(component.modals.modalConfig()['controlListForm'].title).toBe('New list');
      component.listForm.set({ listKey: 'kpi.custom2', name: 'Custom 2', description: 'desc', codePrefix: 'C2' });

      await component.saveList();

      expect(api.POST_ControlList).toHaveBeenCalledWith({
        categoryId: kpiCategory.id,
        listKey: 'kpi.custom2',
        name: 'Custom 2',
        description: 'desc',
        codePrefix: 'C2'
      });
      expect(actions.showToast).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Control Lists',
        detail: 'List created successfully'
      });
    });

    // R-CTL-003 "System key is fixed" (client side): PATCH never carries `listKey`, and the
    // title switches to "Edit list".
    it('edits a list and never sends listKey in the PATCH body', async () => {
      await setup([kpiCategory]);

      component.selectList(customList.id);
      component.startEditList();
      expect(component.modals.modalConfig()['controlListForm'].title).toBe('Edit list');
      component.listForm.update(current => ({ ...current, name: 'Renamed list' }));

      await component.saveList();

      // `customList.description` is null -> startEditList() seeds '' -> trimmed stays ''.
      // PATCH must send '' here (not `undefined`), same rule as the dedicated clear-description
      // test below.
      expect(api.PATCH_ControlList).toHaveBeenCalledWith(customList.id, { name: 'Renamed list', description: '' });
      const [, patchBody] = api.PATCH_ControlList.mock.calls[0];
      expect(patchBody).not.toHaveProperty('listKey');
    });

    // Leader-adjudicated defect, same as the category test: an edit that empties the description
    // must PATCH `description: ''`, not `undefined` (which JSON.stringify drops, leaving the old
    // description in place while the save reports success). Observed RED against the pre-fix
    // code before this fix was applied.
    it('clears a list description on edit when the field is emptied (PATCH sends empty string, not undefined)', async () => {
      const describedList = listSummary({
        id: 12,
        key: 'kpi.described',
        name: 'Described list',
        description: 'Old description',
        isSystem: false
      });
      const categoryWithDescribedList = category({ id: 1, name: 'KPIs', lists: [describedList] });
      await setup([categoryWithDescribedList]);

      component.selectList(describedList.id);
      component.startEditList();
      expect(component.listForm().description).toBe('Old description');
      component.listForm.update(current => ({ ...current, description: '' }));

      await component.saveList();

      expect(api.PATCH_ControlList).toHaveBeenCalledWith(describedList.id, { name: 'Described list', description: '' });
    });

    it('shows a field-named 409 duplicate-key error INLINE under the key input, never as a toast', async () => {
      await setup([kpiCategory]);
      const message = 'A list with key "kpi.custom2" already exists in this portfolio';
      api.POST_ControlList.mockResolvedValueOnce(fail(409, { description: message, field: 'listKey' }));
      component.startCreateList(kpiCategory);
      component.listForm.set({ listKey: 'kpi.custom2', name: 'Custom 2', description: '', codePrefix: '' });

      await component.saveList();
      fixture.detectChanges();

      expect(component.listKeyFieldError()).toBe(message);
      const inline = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="list-key-field-error"]');
      expect(inline?.textContent?.trim()).toBe(message);
      expect(actions.showToast).not.toHaveBeenCalled();
    });

    it('asks for confirmation and deletes a custom list on Continue', async () => {
      await setup([kpiCategory]);
      component.selectList(customList.id);

      component.deleteList();
      expect(api.DELETE_ControlList).not.toHaveBeenCalled();
      expect(actions.showGlobalAlert).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warning', summary: 'Delete list', confirmCallback: expect.objectContaining({ label: 'Continue' }) })
      );

      const alertConfig = actions.showGlobalAlert.mock.calls[0][0];
      alertConfig.confirmCallback.event();
      await fixture.whenStable();
      await fixture.whenStable();

      expect(api.DELETE_ControlList).toHaveBeenCalledWith(customList.id);
      expect(actions.showToast).toHaveBeenCalledWith({ severity: 'success', summary: 'Control Lists', detail: 'List deleted successfully' });
      expect(component.selectedListId()).toBeNull();
    });

    // CR-2 / D-CTL-18: a seeded (system) list goes through the same confirm → DELETE path.
    it('asks for confirmation and deletes a seeded (system) list on Continue', async () => {
      await setup([kpiCategory]);
      component.selectList(directionList.id);

      component.deleteList();
      expect(api.DELETE_ControlList).not.toHaveBeenCalled();

      const alertConfig = actions.showGlobalAlert.mock.calls[0][0];
      alertConfig.confirmCallback.event();
      await fixture.whenStable();
      await fixture.whenStable();

      expect(api.DELETE_ControlList).toHaveBeenCalledWith(directionList.id);
      expect(actions.showToast).toHaveBeenCalledWith({ severity: 'success', summary: 'Control Lists', detail: 'List deleted successfully' });
    });

    // design §6.2 / A8: a 409 (a list with values — any list, seeded or created, CR-2) is shown
    // AS-IS behind a single Close — same pattern as the category delete block.
    it('shows a blocked (409) list delete AS-IS behind a single Close, and does not toast success', async () => {
      await setup([kpiCategory]);
      component.selectList(directionList.id);
      api.DELETE_ControlList.mockResolvedValueOnce(fail(409, { description: 'List "Direction" (key kpi.direction) cannot be deleted while it has values' }));

      component.deleteList();
      const alertConfig = actions.showGlobalAlert.mock.calls[actions.showGlobalAlert.mock.calls.length - 1][0];
      alertConfig.confirmCallback.event();
      await fixture.whenStable();
      await fixture.whenStable();

      expect(actions.showGlobalAlert).toHaveBeenLastCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'Cannot delete list',
          detail: 'List "Direction" (key kpi.direction) cannot be deleted while it has values',
          hasNoCancelButton: true,
          generalButton: true,
          confirmCallback: expect.objectContaining({ label: 'Close' })
        })
      );
      expect(actions.showToast).not.toHaveBeenCalledWith(expect.objectContaining({ detail: 'List deleted successfully' }));
    });

    it('resets the list id when the portfolio changes, so a stale selection cannot leak across portfolios (R-CTL-001)', async () => {
      await setup([kpiCategory]);
      component.selectList(directionList.id);
      expect(component.selectedListId()).toBe(directionList.id);

      await component.selectPortfolio(1);

      expect(component.selectedListId()).toBeNull();
    });
  });

  // ─── T-03: Values (design §4 A9–A12, §6.2 values table + modal, §6.3 DataTable) ───────────

  describe('values', () => {
    const directionList = listSummary({ id: 10, key: 'kpi.direction', name: 'Direction', isSystem: true, valueCount: 2 });
    const kpiCategory = category({ id: 1, name: 'KPIs', lists: [directionList] });

    const directionValues: ControlListValue[] = [
      controlListValue({ id: 101, listId: 10, code: 'DIR-01', value: 'Increase', displayOrder: 1, inUse: 3 }),
      controlListValue({ id: 102, listId: 10, code: 'DIR-02', value: 'Decrease', displayOrder: 2, inUse: 0 })
    ];

    // ─── T-04: "In use" column (design §4 A9 "inUse: number", §6.2 values table) ───────────────
    // Falsifier (a): a fixture where every row shares the same inUse count cannot prove the
    // column renders the PER-ROW value — directionValues above deliberately differ (3 vs 0).
    it('renders the "In use" column between Order and Active, with the per-row count', async () => {
      await setup([kpiCategory]);
      api.GET_ControlListValues.mockResolvedValueOnce(ok(directionValues));
      component.selectList(directionList.id);
      await fixture.whenStable();
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const headers = Array.from(el.querySelectorAll('[data-testid^="column-header-"]')).map(node =>
        node.getAttribute('data-testid')
      );
      const orderIndex = headers.indexOf('column-header-displayOrder');
      const inUseIndex = headers.indexOf('column-header-inUse');
      const activeIndex = headers.indexOf('column-header-isActive');
      expect(inUseIndex).toBeGreaterThan(orderIndex);
      expect(inUseIndex).toBeLessThan(activeIndex);

      const inUseCells = el.querySelectorAll('[data-testid="cell-inUse"]');
      expect(inUseCells.length).toBe(2);
      expect(inUseCells[0].textContent?.trim()).toBe('3');
      expect(inUseCells[1].textContent?.trim()).toBe('0');
    });

    it('loads values for the selected list (A9)', async () => {
      await setup([kpiCategory]);
      api.GET_ControlListValues.mockResolvedValueOnce(ok(directionValues));

      component.selectList(directionList.id);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(api.GET_ControlListValues).toHaveBeenCalledWith(directionList.id);
      expect(component.values()).toEqual(directionValues);
    });

    // Leader-adjudicated defect (T-03 rework): with no guard, selecting list A then quickly list
    // B let A's slower A9 response arrive AFTER B's and overwrite B's table with A's rows — and
    // the next "Add value" on B would then derive its proposed code from A's values and POST it
    // to B. This resolves A's response only AFTER B's has already landed and asserts B's rows
    // are unaffected by A's late arrival.
    it('drops a stale GET_ControlListValues response that resolves after the selection moved to a different list', async () => {
      const secondList = listSummary({ id: 11, key: 'kpi.custom', name: 'Custom list', isSystem: false, codePrefix: 'CUS', valueCount: 1 });
      const multiListCategory = category({ id: 1, name: 'KPIs', lists: [directionList, secondList] });
      await setup([multiListCategory]);

      let resolveA!: (value: MainResponse<ControlListValue[]>) => void;
      const pendingA = new Promise<MainResponse<ControlListValue[]>>(resolve => {
        resolveA = resolve;
      });
      const bValues = [controlListValue({ id: 201, listId: secondList.id, code: 'CUS-01' })];
      api.GET_ControlListValues.mockImplementationOnce(() => pendingA); // A — selected first, resolves LAST
      api.GET_ControlListValues.mockResolvedValueOnce(ok(bValues)); // B — selected second, resolves FIRST

      component.selectList(directionList.id); // A
      component.selectList(secondList.id); // B — the admin navigated away from A before it resolved
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.selectedListId()).toBe(secondList.id);
      expect(component.values()).toEqual(bValues);

      // A's late response arrives now — it must be dropped, not overwrite B's rows.
      resolveA(ok(directionValues));
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.selectedListId()).toBe(secondList.id);
      expect(component.values()).toEqual(bValues);
      expect(api.GET_ControlListValues).toHaveBeenCalledTimes(2);
    });

    // Falsifier 3: binding the ID to an input would make this fail — the ID column renders as
    // plain text (no `<input>` anywhere in that cell), same for every other column (the shared
    // DataTable never puts a form control in a cell).
    it('renders the ID column as plain read-only text in the values table, with no input anywhere in the row', async () => {
      await setup([kpiCategory]);
      api.GET_ControlListValues.mockResolvedValueOnce(ok(directionValues));
      component.selectList(directionList.id);
      await fixture.whenStable();
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const idCells = el.querySelectorAll('[data-testid="cell-id"]');
      expect(idCells.length).toBe(2);
      expect(idCells[0].textContent?.trim()).toBe('101');
      expect(idCells[0].querySelector('input')).toBeFalsy();
    });

    it('shows the values empty state with + Add value for a list with no values', async () => {
      await setup([kpiCategory]);
      api.GET_ControlListValues.mockResolvedValueOnce(ok([]));
      component.selectList(directionList.id);
      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[data-testid="values-empty-state"]')).toBeTruthy();
      expect(el.querySelector('[data-testid="add-value-empty-button"]')).toBeTruthy();
    });

    // ─── Modal: ID read-only in edit mode, absent in create mode (R-CTL-004 AC.3) ────────────

    it('shows the ID as read-only TEXT in the edit modal, with no form control bound to it (falsifier 3)', async () => {
      await setup([kpiCategory]);
      component.selectList(directionList.id);
      await fixture.whenStable();

      component.startEditValue(directionValues[0]);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const idNode = el.querySelector('[data-testid="value-id-readonly"]');
      expect(idNode).toBeTruthy();
      expect(idNode?.tagName.toLowerCase()).not.toBe('input');
      expect(idNode?.querySelector('input')).toBeFalsy();
      expect(idNode?.textContent?.trim()).toBe('101');
    });

    it('has no ID control at all in the create modal', async () => {
      await setup([kpiCategory]);
      component.selectList(directionList.id);
      await fixture.whenStable();

      component.startCreateValue();
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="value-id-readonly"]')).toBeFalsy();
    });

    // ─── Code proposal (D-CTL-17, design §5 rule 4) — mirrors the server's `proposeNextCode`,
    // keyed off the LIST's OWN `codePrefix`, never a prefix guessed from the loaded codes ──────

    it('pre-fills the proposed next code on create, computed from the already-loaded values of the SAME prefix', async () => {
      await setup([kpiCategory]);
      api.GET_ControlListValues.mockResolvedValueOnce(
        ok([controlListValue({ id: 1, code: 'DIR-07' }), controlListValue({ id: 2, code: 'DIR-03' })])
      );
      component.selectList(directionList.id);
      await fixture.whenStable();
      fixture.detectChanges();

      component.startCreateValue();

      expect(component.valueForm().code).toBe('DIR-08');
    });

    it('proposes a no-dash code (org.level convention: L4 -> L5)', async () => {
      const orgLevelList = listSummary({ id: 20, key: 'org.level', name: 'Organizational level', codePrefix: 'L', isSystem: true });
      const orgCategory = category({ id: 3, name: 'Organizational structure', lists: [orgLevelList] });
      await setup([orgCategory]);
      api.GET_ControlListValues.mockResolvedValueOnce(
        ok([controlListValue({ id: 1, listId: 20, code: 'L1' }), controlListValue({ id: 2, listId: 20, code: 'L4' }), controlListValue({ id: 3, listId: 20, code: 'L2' })])
      );
      component.selectList(orgLevelList.id);
      await fixture.whenStable();
      fixture.detectChanges();

      component.startCreateValue();

      expect(component.valueForm().code).toBe('L5');
    });

    // Reviewer FAIL (T-03 attempt 1, reliability finding 1a): the OLD heuristic inferred the
    // prefix from whichever existing code happened to carry the highest trailing number,
    // whatever prefix it used — so a value whose code was hand-edited to `X-50` would win and
    // propose `X-51` even on a `kpi.unit_of_measure` list (whose own prefix is `UOM`), while the
    // server would propose `UOM-08`. The fix keys the regex off `list.codePrefix` and ignores
    // every code that does not match the list's OWN prefix pattern.
    it('ignores a value code carrying a DIFFERENT prefix when proposing the next code (mixed-prefix, reviewer finding 1a)', async () => {
      const uomList = listSummary({ id: 30, key: 'kpi.unit_of_measure', name: 'Unit of measure', codePrefix: 'UOM', isSystem: true });
      const uomCategory = category({ id: 4, name: 'KPIs', lists: [uomList] });
      await setup([uomCategory]);
      api.GET_ControlListValues.mockResolvedValueOnce(
        ok([
          controlListValue({ id: 1, listId: 30, code: 'UOM-01' }),
          controlListValue({ id: 2, listId: 30, code: 'UOM-02' }),
          controlListValue({ id: 3, listId: 30, code: 'UOM-03' }),
          controlListValue({ id: 4, listId: 30, code: 'UOM-04' }),
          controlListValue({ id: 5, listId: 30, code: 'UOM-05' }),
          controlListValue({ id: 6, listId: 30, code: 'UOM-06' }),
          controlListValue({ id: 7, listId: 30, code: 'UOM-07' }),
          // Hand-edited to another list's prefix, with a higher trailing number than any UOM code.
          controlListValue({ id: 8, listId: 30, code: 'X-50' })
        ])
      );
      component.selectList(uomList.id);
      await fixture.whenStable();
      fixture.detectChanges();

      component.startCreateValue();

      expect(component.valueForm().code).toBe('UOM-08');
    });

    // Reviewer FAIL (T-03 attempt 1, reliability finding 1b): the OLD heuristic left the code
    // blank on an empty list (no code to infer a prefix from), so a brand-new list's very first
    // value never showed a proposed code at all. D-CTL-17 / design §5 rule 4: the client now
    // pre-fills `<prefix>-01` (or `L1`) exactly as the server's `proposeNextCode` would.
    it('pre-fills <prefix>-01 when the list has no existing values (empty list, reviewer finding 1b)', async () => {
      await setup([kpiCategory]);
      api.GET_ControlListValues.mockResolvedValueOnce(ok([]));
      component.selectList(directionList.id);
      await fixture.whenStable();
      fixture.detectChanges();

      component.startCreateValue();

      expect(component.valueForm().code).toBe('DIR-01');
    });

    // ─── Create / edit against real MainResponse shapes ──────────────────────────────────────

    it('creates a value and reloads values + categories (so valueCount updates)', async () => {
      await setup([kpiCategory]);
      api.GET_ControlListValues.mockResolvedValue(ok(directionValues));
      component.selectList(directionList.id);
      await fixture.whenStable();

      component.startCreateValue();
      component.valueForm.set({ code: 'DIR-03', value: 'Maintain', description: 'Hold steady', displayOrder: 3, isActive: true });
      api.GET_ControlListCategories.mockClear();

      await component.saveValue();

      expect(api.POST_ControlListValue).toHaveBeenCalledWith(directionList.id, {
        code: 'DIR-03',
        value: 'Maintain',
        description: 'Hold steady',
        displayOrder: 3,
        isActive: true
      });
      expect(actions.showToast).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Control Lists',
        detail: 'Value created successfully'
      });
      // Reloads both A9 (this list's values) and A1 (categories, for valueCount) — Leader's
      // brief: "After value create/delete, the navigator valueCount must update".
      expect(api.GET_ControlListValues).toHaveBeenCalledTimes(2); // initial select + reload after save
      expect(api.GET_ControlListCategories).toHaveBeenCalledTimes(1);
    });

    // ─── Cleared Order field (reviewer finding, T-03 rework) ──────────────────────────────────
    // `p-inputNumber` emits `null` when the field is cleared; the component's `ValueFormValue`
    // type is `number | null` for exactly this reason. A NOT NULL `display_order` column must
    // never receive that `null` on the wire.

    it('sends displayOrder: 0 on CREATE when the Order field was cleared (null)', async () => {
      await setup([kpiCategory]);
      api.GET_ControlListValues.mockResolvedValue(ok(directionValues));
      component.selectList(directionList.id);
      await fixture.whenStable();

      component.startCreateValue();
      component.valueForm.set({ code: 'DIR-03', value: 'Maintain', description: '', displayOrder: null, isActive: true });

      await component.saveValue();

      expect(api.POST_ControlListValue).toHaveBeenCalledWith(
        directionList.id,
        expect.objectContaining({ displayOrder: 0 })
      );
    });

    it('omits displayOrder on PATCH when the Order field was cleared (null), instead of wiping it to 0', async () => {
      await setup([kpiCategory]);
      api.GET_ControlListValues.mockResolvedValue(ok(directionValues));
      component.selectList(directionList.id);
      await fixture.whenStable();

      component.startEditValue(directionValues[0]);
      component.valueForm.update(current => ({ ...current, displayOrder: null }));

      await component.saveValue();

      const [, patchBody] = api.PATCH_ControlListValue.mock.calls[0];
      expect(patchBody).not.toHaveProperty('displayOrder');
    });

    // Falsifier 2: whitelisting `id` in the update DTO is a SERVER-side mutation, but the client
    // contract must not even offer it — the PATCH body sent here never carries an `id` key.
    it('edits a value and never sends `id` in the PATCH body (D-CTL-14 / falsifier 2)', async () => {
      await setup([kpiCategory]);
      api.GET_ControlListValues.mockResolvedValue(ok(directionValues));
      component.selectList(directionList.id);
      await fixture.whenStable();

      component.startEditValue(directionValues[0]);
      component.valueForm.update(current => ({ ...current, value: 'Increase sharply' }));

      await component.saveValue();

      expect(api.PATCH_ControlListValue).toHaveBeenCalledWith(101, {
        code: 'DIR-01',
        value: 'Increase sharply',
        description: '',
        displayOrder: 1,
        isActive: true
      });
      const [, patchBody] = api.PATCH_ControlListValue.mock.calls[0];
      expect(patchBody).not.toHaveProperty('id');
    });

    it('shows a field-named 409 duplicate-CODE error inline under the code input, never as a toast', async () => {
      await setup([kpiCategory]);
      component.selectList(directionList.id);
      await fixture.whenStable();
      const message = 'A value with code "DIR-01" already exists in this list';
      api.POST_ControlListValue.mockResolvedValueOnce(fail(409, { description: message, field: 'code' }));

      component.startCreateValue();
      component.valueForm.update(current => ({ ...current, value: 'Increase' }));
      await component.saveValue();
      fixture.detectChanges();

      expect(component.valueCodeFieldError()).toBe(message);
      const inline = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="value-code-field-error"]');
      expect(inline?.textContent?.trim()).toBe(message);
      expect(actions.showToast).not.toHaveBeenCalled();
    });

    it('shows a field-named 409 duplicate-VALUE error inline under the value input, never as a toast', async () => {
      await setup([kpiCategory]);
      component.selectList(directionList.id);
      await fixture.whenStable();
      const message = 'A value "Increase" already exists in this list';
      api.POST_ControlListValue.mockResolvedValueOnce(fail(409, { description: message, field: 'value' }));

      component.startCreateValue();
      component.valueForm.update(current => ({ ...current, value: 'Increase' }));
      await component.saveValue();
      fixture.detectChanges();

      expect(component.valueValueFieldError()).toBe(message);
      const inline = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="value-value-field-error"]');
      expect(inline?.textContent?.trim()).toBe(message);
      expect(actions.showToast).not.toHaveBeenCalled();
    });

    // ─── Delete: confirm flow + blocked (409) shown AS-IS ─────────────────────────────────────

    it('asks for confirmation before deleting a value, deletes on Continue, and reloads values + categories', async () => {
      await setup([kpiCategory]);
      api.GET_ControlListValues.mockResolvedValue(ok(directionValues));
      component.selectList(directionList.id);
      await fixture.whenStable();
      api.GET_ControlListCategories.mockClear();

      component.deleteValue(directionValues[0]);
      expect(api.DELETE_ControlListValue).not.toHaveBeenCalled();
      expect(actions.showGlobalAlert).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warning', summary: 'Delete value', confirmCallback: expect.objectContaining({ label: 'Continue' }) })
      );

      const alertConfig = actions.showGlobalAlert.mock.calls[actions.showGlobalAlert.mock.calls.length - 1][0];
      alertConfig.confirmCallback.event();
      await fixture.whenStable();
      await fixture.whenStable();
      await fixture.whenStable();
      await fixture.whenStable();

      expect(api.DELETE_ControlListValue).toHaveBeenCalledWith(101);
      expect(actions.showToast).toHaveBeenCalledWith({ severity: 'success', summary: 'Control Lists', detail: 'Value deleted successfully' });
      expect(api.GET_ControlListCategories).toHaveBeenCalledTimes(1);
      expect(component.deletingValueId()).toBeNull();
    });

    it('shows a blocked (409) value delete AS-IS behind a single Close, and does not toast success', async () => {
      await setup([kpiCategory]);
      api.GET_ControlListValues.mockResolvedValue(ok(directionValues));
      component.selectList(directionList.id);
      await fixture.whenStable();
      api.DELETE_ControlListValue.mockResolvedValueOnce(fail(409, { description: 'This value is in use by 3 records. Deactivate it instead.' }));

      component.deleteValue(directionValues[0]);
      const alertConfig = actions.showGlobalAlert.mock.calls[actions.showGlobalAlert.mock.calls.length - 1][0];
      alertConfig.confirmCallback.event();
      await fixture.whenStable();
      await fixture.whenStable();

      expect(actions.showGlobalAlert).toHaveBeenLastCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'Cannot delete value',
          detail: 'This value is in use by 3 records. Deactivate it instead.',
          hasNoCancelButton: true,
          generalButton: true,
          confirmCallback: expect.objectContaining({ label: 'Close' })
        })
      );
      expect(actions.showToast).not.toHaveBeenCalledWith(expect.objectContaining({ detail: 'Value deleted successfully' }));
    });

    it('clears the values list and state when the portfolio changes (R-CTL-001 isolation)', async () => {
      await setup([kpiCategory]);
      api.GET_ControlListValues.mockResolvedValue(ok(directionValues));
      component.selectList(directionList.id);
      await fixture.whenStable();
      expect(component.values().length).toBe(2);

      await component.selectPortfolio(1);

      expect(component.values()).toEqual([]);
    });
  });
});
