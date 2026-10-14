import { Component, Input, WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Select } from 'primeng/select';
import { DataTableComponent } from '@shared/components/data-table/data-table.component';
import ControlListsComponent from './control-lists.component';
import {
  ControlList,
  ControlListCategory,
  ControlListSummary,
  ControlListValue
} from '@shared/interfaces/control-lists.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { Portfolio } from '@shared/interfaces/portfolio.interface';
import { buildExportRows } from '@shared/utils/xlsx-export.util';
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

const category = (overrides: Partial<ControlListCategory> = {}): ControlListCategory => ({
  id: 1,
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
  // R-CLG-009 / AC.3: every value applies to all portfolios unless restricted (A9 `appliesTo`/`appliesToAll`).
  appliesTo: [],
  appliesToAll: true,
  ...overrides
});

// GET_Portfolios returns ACTIVE portfolios (`PortfoliosService.findAll`: `is_active: true`); the
// shape is the portfolio-management page's `Portfolio` (snake_case, no short-name field).
const portfolio = (id: number, name: string, overrides: Partial<Portfolio> = {}): Portfolio => ({
  id,
  name,
  description: '',
  start_year: 2021,
  end_year: 2025,
  is_active: true,
  ...overrides
});
const PORTFOLIO_1 = portfolio(1, 'Portfolio 1');
const PORTFOLIO_2 = portfolio(2, 'Portfolio 2', { start_year: 2026, end_year: 2030 });

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
    GET_ControlListCategories: jest.fn(),
    // R-CLG-009: active portfolios, loaded in parallel with A1 for the Applies to field.
    GET_Portfolios: jest.fn(),
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

  // Every ApiService member the page reaches for that the mock does not define lands here — the
  // mock object itself cannot answer "was a removed method (A2) called?", this can (T-01 advisory:
  // `expect(api).not.toHaveProperty(...)` only inspected the test's own object).
  let unknownApiAccess: string[] = [];

  async function setup(
    categories: ControlListCategory[] = [category()],
    portfoliosCall: () => Promise<unknown> = () => Promise.resolve(ok([PORTFOLIO_1, PORTFOLIO_2]))
  ): Promise<void> {
    unknownApiAccess = [];
    const apiProxy = new Proxy(api, {
      get: (target, key) => {
        if (typeof key === 'string' && /^(GET|POST|PATCH|DELETE|PUT)_/.test(key) && !(key in target)) unknownApiAccess.push(key);
        return (target as Record<string | symbol, unknown>)[key];
      }
    });
    modalConfig = signal<Record<string, any>>({ controlListForm: { isOpen: false, title: 'New category' } });
    modals = {
      modalConfig,
      openModal: jest.fn((name: string) => modalConfig.update(current => ({ ...current, [name]: { ...current[name], isOpen: true } }))),
      closeModal: jest.fn((name: string) => modalConfig.update(current => ({ ...current, [name]: { ...current[name], isOpen: false } })))
    };
    actions = { showToast: jest.fn(), showGlobalAlert: jest.fn() };

    jest.clearAllMocks();
    api.GET_ControlListCategories.mockResolvedValue(ok(categories));
    api.GET_Portfolios.mockImplementation(portfoliosCall);
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
        { provide: ApiService, useValue: apiProxy as unknown as ApiService },
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
    // load() awaits loadCategories(), which awaits the API call — two promise-chain levels, so a
    // single whenStable() can leave the fixture short of idle; settle twice.
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  // ─── Global lists, no portfolio selector (R-CLG-001, R-CLG-005) ────────────────

  it('loads the categories with ONE argument-less call and the active portfolios once; never calls the removed A2', async () => {
    await setup();

    expect(api.GET_ControlListCategories).toHaveBeenCalledTimes(1);
    expect(api.GET_ControlListCategories).toHaveBeenCalledWith();
    expect(api.GET_Portfolios).toHaveBeenCalledTimes(1);
    expect(component.categories()).toHaveLength(1);
    expect(component.loading()).toBe(false);
    expect(component.loadError()).toBe(false);
    // A2 was removed from ApiService (T-01): any `GET_ControlListPortfolioSummaries` access on the
    // proxied mock is recorded, so a regression that calls it makes this list non-empty.
    expect(unknownApiAccess).toEqual([]);
  });

  // R-CLG-005 AC.2 / design §6 Load: the two requests start together (KZ-015: the TRANSITION —
  // both pending, then both settle — not an end state).
  it('starts the portfolios request in parallel with A1, before either has resolved', async () => {
    await setup();
    api.GET_ControlListCategories.mockClear();
    api.GET_Portfolios.mockClear();
    let releaseCategories!: (value: MainResponse<ControlListCategory[]>) => void;
    let releasePortfolios!: (value: MainResponse<Portfolio[]>) => void;
    api.GET_ControlListCategories.mockReturnValueOnce(new Promise(resolve => (releaseCategories = resolve)));
    api.GET_Portfolios.mockReturnValueOnce(new Promise(resolve => (releasePortfolios = resolve)));

    const pending = component.load();

    expect(api.GET_ControlListCategories).toHaveBeenCalledTimes(1);
    expect(api.GET_Portfolios).toHaveBeenCalledTimes(1);

    releasePortfolios(ok([PORTFOLIO_2]));
    releaseCategories(ok([category({ name: 'Loaded after both' })]));
    await pending;
    fixture.detectChanges();

    expect(component.categories()[0].name).toBe('Loaded after both');
    expect(component.portfolios().map(entry => entry.name)).toEqual(['Portfolio 2']);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loaded after both');
  });

  it('renders no portfolio selector, no `P<n> ·` text and no *(not configured)* in the page header, the navigator or the list header', async () => {
    await setup([category({ lists: [listSummary()] })]);
    component.selectList(10);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    // Portfolio text is legitimate now ONLY inside the values panel and the value modal
    // (R-CLG-009: Applies to column, filter, modal field) — so the old whole-page assertion is
    // narrowed to the regions that must stay portfolio-free (T-01 forward pointer), not deleted.
    const portfolioFreeRegions = ['page-header', 'navigator-panel', 'list-header'].map(testId => {
      const region = el.querySelector(`[data-testid="${testId}"]`);
      expect(region).toBeTruthy();
      return region as HTMLElement;
    });
    for (const region of portfolioFreeRegions) {
      expect(region.querySelector('p-select')).toBeNull();
      expect(region.querySelector('select, [role="combobox"]')).toBeNull();
      expect(region.textContent).not.toMatch(/portfolio/i);
      expect(region.textContent).not.toMatch(/P\d+\s*·/);
    }
    expect(el.querySelector('[data-testid="portfolio-select"]')).toBeNull();
    expect(el.textContent).not.toMatch(/not configured/i);
    // The one select on the page is the values filter, inside the values panel.
    expect(el.querySelectorAll('p-select')).toHaveLength(1);
    expect(el.querySelector('[data-testid="values-panel"] p-select')).toBeTruthy();
  });

  it('shows the list header as `Key: <key>` with no reference prefix', async () => {
    await setup([category({ lists: [listSummary({ key: 'org.level', name: 'Organizational level' })] })]);
    component.selectList(10);
    fixture.detectChanges();

    const header = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="list-header"]');
    expect(header?.textContent).toMatch(/Key:\s*org\.level/);
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="list-header-key"]')?.textContent?.trim()).toBe('org.level');
    expect(header?.textContent).not.toContain('Reference');
  });

  it('shows the empty state with + New category when the module has no categories', async () => {
    await setup([]);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="empty-state"]')?.textContent).toContain('No categories yet.');
    expect(el.querySelector('[data-testid="empty-new-category-button"]')).toBeTruthy();
  });

  // ─── Loading / error / success states (R-CTL-008) ─────────────────────────────

  it('shows the loading bar while the categories request is pending (loading state)', async () => {
    await setup();
    let release!: (value: MainResponse<ControlListCategory[]>) => void;
    api.GET_ControlListCategories.mockReturnValueOnce(new Promise(resolve => (release = resolve)));

    const pending = component.load();
    fixture.detectChanges();
    expect(component.loading()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="progress-bar"]')).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="empty-state"]')).toBeNull();

    release(ok([category()]));
    await pending;
    fixture.detectChanges();
    expect(component.loading()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="progress-bar"]')).toBeNull();
  });

  it('sets loadError and shows the error state when the categories request throws', async () => {
    await setup();
    // A synchronous throw (not mockRejectedValueOnce) — caught at the `await` call site itself,
    // with no separately-constructed rejected Promise to leak as an unhandled rejection.
    api.GET_ControlListCategories.mockImplementationOnce(() => {
      throw new Error('network down');
    });

    await component.load();
    fixture.detectChanges();

    expect(component.loadError()).toBe(true);
    expect(component.categories()).toEqual([]);
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="error-state"]')).toBeTruthy();
  });

  it('sets loadError for an unsuccessful categories response, and recovers on a retry (load again)', async () => {
    await setup();
    api.GET_ControlListCategories.mockResolvedValueOnce(fail(500, 'boom', 'InternalServerErrorException'));

    await component.load();
    fixture.detectChanges();
    expect(component.loadError()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="error-state"]')).toBeTruthy();

    // The error state offers a Retry button wired to load().
    const retry = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="retry-button"] button') as HTMLButtonElement;
    expect(retry).toBeTruthy();
    retry.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.loadError()).toBe(false);
    expect(component.categories()).toHaveLength(1);
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="error-state"]')).toBeNull();
  });

  // ─── Category CRUD against real MainResponse shapes ───────────────────────────

  it('creates a category, shows a success toast, and reloads the list', async () => {
    await setup([]);

    component.startCreate();
    expect(modals.openModal).toHaveBeenCalledWith('controlListForm');
    component.form.set({ name: 'Key Performance Indicators (KPIs)', description: 'KPI lists' });

    await component.save();

    // R-CLG-001: the create body carries no portfolio at all — exact shape, not objectContaining.
    expect(api.POST_ControlListCategory).toHaveBeenCalledWith({
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
    const message = 'A category named "Key Performance Indicators (KPIs)" already exists';
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

  it('shows a plain-string error as-is — `errors` is a PLAIN STRING here, a third shape alongside the 409 object and 400 array', async () => {
    // NotFoundException's body is `{ description: 'NotFoundException', status: 404,
    // errors: 'Category 999 not found', timestamp, path }` — `errors` is a bare string, not the
    // `{ description, field }` shape 409 uses. extractFieldError's string branch must carry this.
    await setup([]);
    const message = 'Category 999 not found';
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

    // "selecting a list updates the header" + "the header reads Key: kpi.direction" (R-CLG-003)
    it('selecting a list updates the header, showing its name, description and its key alone', async () => {
      await setup([kpiCategory]);
      expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="list-detail-empty"]')).toBeTruthy();

      component.selectList(directionList.id);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[data-testid="list-detail-empty"]')).toBeFalsy();
      expect(el.querySelector('[data-testid="list-header-name"]')?.textContent?.trim()).toBe('Direction');
      expect(el.querySelector('[data-testid="list-header-description"]')?.textContent?.trim()).toBe(directionList.description);
      expect(el.querySelector('[data-testid="list-header-key"]')?.textContent?.trim()).toBe('kpi.direction');
      expect(el.querySelector('[data-testid="list-header"]')?.textContent).toMatch(/Key:\s*kpi\.direction/);
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
      const message = 'A list with key "kpi.custom2" already exists';
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

    it('shows the key hint "Unique across all lists… consumers read the list by this key" in the list modal', async () => {
      await setup([kpiCategory]);
      component.startCreateList(kpiCategory);
      fixture.detectChanges();

      const hint = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="list-key-hint"]');
      expect(hint?.textContent).toContain('Unique across all lists');
      expect(hint?.textContent).toContain('Consumers read the list by this key');
    });

    it('create-list payload carries no portfolio and the key stays create-only', async () => {
      await setup([kpiCategory]);
      component.startCreateList(kpiCategory);
      component.listForm.set({ listKey: 'kpi.custom2', name: 'Custom 2', description: '', codePrefix: '' });

      await component.saveList();

      expect(api.POST_ControlList).toHaveBeenCalledWith({
        categoryId: kpiCategory.id,
        listKey: 'kpi.custom2',
        name: 'Custom 2',
        description: undefined,
        codePrefix: undefined
      });
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

    // R-CTL-009 "Export respects filter and sort" — the page half: the file name carries the
    // SELECTED list's name (design §6.3), read off the rendered DataTable, not the page's computed.
    it('passes an export file name containing the selected list name to the rendered data table', async () => {
      await setup([kpiCategory]);
      api.GET_ControlListValues.mockResolvedValueOnce(ok(directionValues));
      component.selectList(directionList.id);
      await fixture.whenStable();
      fixture.detectChanges();

      const table = fixture.debugElement.query(By.directive(DataTableComponent)).componentInstance as DataTableComponent<ControlListValue>;
      expect(table.exportFileName).toBe('control-list-values-direction.xlsx');
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

    // Validation A-2: the suffix scan ignores letter case, like the server and the case-insensitive
    // unique index — a lowercase `dir-04` must count, or the pre-filled `DIR-02` would 409 on Save.
    it('counts a lowercase code of the same prefix when proposing the next code (dir-04 -> DIR-05)', async () => {
      await setup([kpiCategory]);
      api.GET_ControlListValues.mockResolvedValueOnce(
        ok([controlListValue({ id: 1, code: 'DIR-01' }), controlListValue({ id: 2, code: 'dir-04' })])
      );
      component.selectList(directionList.id);
      await fixture.whenStable();
      fixture.detectChanges();

      component.startCreateValue();

      expect(component.valueForm().code).toBe('DIR-05');
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
      component.valueForm.set({ code: 'DIR-03', value: 'Maintain', description: 'Hold steady', displayOrder: 3, isActive: true, portfolioIds: [] });
      api.GET_ControlListCategories.mockClear();

      await component.saveValue();

      expect(api.POST_ControlListValue).toHaveBeenCalledWith(directionList.id, {
        code: 'DIR-03',
        value: 'Maintain',
        description: 'Hold steady',
        displayOrder: 3,
        isActive: true,
        portfolioIds: []
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
      component.valueForm.set({ code: 'DIR-03', value: 'Maintain', description: '', displayOrder: null, isActive: true, portfolioIds: [] });

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
        isActive: true,
        portfolioIds: []
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
  });
  // ─── changes/control-lists-global-scope T-02: values applicable per portfolio (R-CLG-009) ───────
  //
  // What these cannot reach (KZ-017): jsdom has no layout, so the rendered width/overflow of the
  // new column is checked only at the HITL pause (design §10); the API is mocked, so the server's
  // own A13 SQL rule is proven by the server integration suite, not here — this file proves the
  // CLIENT-side copy of that rule against literals taken from the R-CLG-009 scenarios.
  describe('applies to (R-CLG-009)', () => {
    const directionList = listSummary({ id: 10, key: 'kpi.direction', name: 'Direction', isSystem: true, valueCount: 6 });
    const kpiCategory = category({ id: 1, name: 'KPIs', lists: [directionList] });

    // ONE shared fixture for the column labels AND the filter rule. It must mix every case the
    // rule distinguishes (design §10 / tasks T-02 disqualifier): unrestricted, restricted-to-P2,
    // restricted to a SET containing P2, linked only to INACTIVE portfolios, and an inactive value.
    const increase = controlListValue({ id: 1, code: 'DIR-01', value: 'Increase', displayOrder: 1 });
    const maintain = controlListValue({ id: 2, code: 'DIR-02', value: 'Maintain within range', displayOrder: 2, appliesTo: [2], appliesToAll: false });
    const legacy = controlListValue({ id: 3, code: 'DIR-03', value: 'Legacy band', displayOrder: 3, appliesTo: [], appliesToAll: false });
    const both = controlListValue({ id: 4, code: 'DIR-04', value: 'Both portfolios', displayOrder: 4, appliesTo: [1, 2], appliesToAll: false });
    const retired = controlListValue({ id: 5, code: 'DIR-05', value: 'Retired value', displayOrder: 5, isActive: false });
    const fixtureValues = [increase, maintain, legacy, both, retired];

    // A synchronous throw (not a pre-built rejected Promise): it is caught at the `await` call site
    // inside the component, with no separately-constructed rejection to leak as unhandled (same
    // reason as the categories-failure test above).
    const portfoliosDown = (): Promise<unknown> => {
      throw new Error('portfolios down');
    };

    let originalMatchMedia: PropertyDescriptor | undefined;

    beforeAll(() => {
      // jsdom has no matchMedia; PrimeNG's Overlay probes it when the filter panel opens.
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
      document.body.querySelectorAll('.p-select-overlay, .p-overlay').forEach(el => el.remove());
    });

    async function openList(values: ControlListValue[] = fixtureValues, portfoliosCall?: () => Promise<unknown>): Promise<void> {
      await setup([kpiCategory], portfoliosCall);
      api.GET_ControlListValues.mockResolvedValue(ok(values));
      component.selectList(directionList.id);
      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

    function renderedColumn(testId: string): string[] {
      return Array.from(root().querySelectorAll(`[data-testid="${testId}"]`)).map(cell => (cell.textContent ?? '').trim());
    }

    function filterSelect(): Select {
      const selectDe = fixture.debugElement
        .queryAll(By.directive(Select))
        .find(de => (de.nativeElement as HTMLElement).getAttribute('data-testid') === 'values-portfolio-filter');
      expect(selectDe).toBeDefined();
      return selectDe!.componentInstance as Select;
    }

    /** Opens the REAL PrimeNG overlay and clicks the option whose text matches — the rendered binding, not `pfFilter.set()`. */
    async function chooseFilterOption(label: string): Promise<void> {
      filterSelect().show();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const option = Array.from(document.body.querySelectorAll('.p-select-option')).find(el => (el.textContent ?? '').trim() === label) as
        | HTMLElement
        | undefined;
      expect(option).toBeTruthy();
      option!.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    // ─── Applies to column ─────────────────────────────────────────────────────────────────────

    it('labels each row All / the portfolio names / No active portfolio in the rendered Applies to column', async () => {
      await openList();

      const headers = Array.from(root().querySelectorAll('[data-testid^="column-header-"]')).map(node => node.getAttribute('data-testid'));
      expect(headers.indexOf('column-header-appliesToLabel')).toBeGreaterThan(headers.indexOf('column-header-displayOrder'));
      expect(headers.indexOf('column-header-appliesToLabel')).toBeLessThan(headers.indexOf('column-header-inUse'));
      expect(root().querySelector('[data-testid="column-header-appliesToLabel"]')?.textContent).toContain('Applies to');

      // Rows are DIR-01..DIR-05 (default sort: code ascending).
      expect(renderedColumn('cell-appliesToLabel')).toEqual([
        'All', // increase: appliesToAll
        'Portfolio 2', // maintain: restricted to P2
        'No active portfolio', // legacy: appliesToAll = false and appliesTo = [] — NOT "All"
        'Portfolio 1, Portfolio 2', // both
        'All' // retired: an inactive VALUE is still unrestricted
      ]);
    });

    it('shows the ids instead of names in the column when the portfolios call failed (design §6, S-4)', async () => {
      await openList(fixtureValues, portfoliosDown);

      expect(renderedColumn('cell-appliesToLabel')).toEqual(['All', '2', 'No active portfolio', '1, 2', 'All']);
    });

    it('includes the Applies to column in the export rows, with the same labels the table shows', async () => {
      await openList();

      const table = fixture.debugElement.query(By.directive(DataTableComponent)).componentInstance as DataTableComponent<Record<string, unknown>>;
      const exported = buildExportRows({ columns: table.columns, rows: table.displayRows() });

      const appliesToIndex = exported[0].indexOf('Applies to');
      expect(appliesToIndex).toBeGreaterThan(-1);
      expect(exported.slice(1).map(row => row[appliesToIndex])).toEqual(['All', 'Portfolio 2', 'No active portfolio', 'Portfolio 1, Portfolio 2', 'All']);
    });

    // ─── Show values for: filter (same rule as A13, client-side) ───────────────────────────────
    //
    // Expected lists are literals worked out from R-CLG-009 (*Value for one portfolio only*,
    // *Portfolio deactivated after linking*), not recomputed with the component's own rule.

    it('shows every value when no portfolio is chosen, including the one linked only to inactive portfolios', async () => {
      await openList();

      expect(renderedColumn('cell-value')).toEqual(['Increase', 'Maintain within range', 'Legacy band', 'Both portfolios', 'Retired value']);
    });

    it('filtered to Portfolio 1: unrestricted + P1-linked values only; the P2-only and the inactive-links values are NOT shown', async () => {
      await openList();

      await chooseFilterOption('Portfolio 1');

      expect(renderedColumn('cell-value')).toEqual(['Increase', 'Both portfolios', 'Retired value']);
    });

    it('filtered to Portfolio 2: unrestricted + P2-linked values; the value linked only to inactive portfolios is still never shown', async () => {
      await openList();

      await chooseFilterOption('Portfolio 2');

      expect(renderedColumn('cell-value')).toEqual(['Increase', 'Maintain within range', 'Both portfolios', 'Retired value']);
      expect(renderedColumn('cell-value')).not.toContain('Legacy band');
    });

    it('returns to every value when All portfolios is chosen again', async () => {
      await openList();
      await chooseFilterOption('Portfolio 1');

      await chooseFilterOption('All portfolios');

      expect(renderedColumn('cell-value')).toHaveLength(5);
    });

    it('tells a filter that excludes every value apart from a list with no values (no "Add value" prompt)', async () => {
      await openList([maintain]); // only restricted to P2

      await chooseFilterOption('Portfolio 1');

      expect(root().querySelector('[data-testid="values-filtered-empty"]')?.textContent).toContain('No values apply to this portfolio');
      expect(root().querySelector('[data-testid="values-empty-state"]')).toBeNull();
      expect(root().querySelector('[data-testid="add-value-empty-button"]')).toBeNull();
    });

    it('resets the filter when another list is selected', async () => {
      const otherList = listSummary({ id: 11, key: 'kpi.type', name: 'KPI type', codePrefix: 'KTY' });
      await setup([category({ id: 1, name: 'KPIs', lists: [directionList, otherList] })]);
      api.GET_ControlListValues.mockResolvedValue(ok(fixtureValues));
      component.selectList(directionList.id);
      await fixture.whenStable();
      fixture.detectChanges();
      await chooseFilterOption('Portfolio 1');
      expect(renderedColumn('cell-value')).toHaveLength(3);

      component.selectList(otherList.id);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(renderedColumn('cell-value')).toHaveLength(5);
    });

    // ─── Value modal: Applies to checkbox group ────────────────────────────────────────────────

    function checkbox(portfolioId: number): HTMLInputElement {
      return root().querySelector(`[data-testid="value-applies-to-${portfolioId}"]`) as HTMLInputElement;
    }

    it('renders one checkbox per ACTIVE portfolio, all unticked, with the "none ticked = all portfolios" hint on create', async () => {
      await openList();

      component.startCreateValue();
      fixture.detectChanges();

      expect(root().querySelectorAll('[data-testid^="value-applies-to-"][type="checkbox"]')).toHaveLength(2);
      expect(checkbox(1).checked).toBe(false);
      expect(checkbox(2).checked).toBe(false);
      expect(root().querySelector('[data-testid="value-applies-to-hint"]')?.textContent).toContain('None ticked = applies to all portfolios');
      expect(root().querySelector('[data-testid="value-applies-to-hint"]')?.textContent).toContain('Records that already use it stay valid');
    });

    it('does not offer an inactive portfolio (is_active = false) in the checkbox group', async () => {
      await openList(fixtureValues, () => Promise.resolve(ok([PORTFOLIO_1, portfolio(3, 'Portfolio 0', { is_active: false })])));

      component.startCreateValue();
      fixture.detectChanges();

      expect(checkbox(1)).toBeTruthy();
      expect(checkbox(3)).toBeNull();
    });

    it('creates with portfolioIds: [] when no checkbox is ticked (empty = all portfolios, never undefined)', async () => {
      await openList();
      component.startCreateValue();
      component.valueForm.update(current => ({ ...current, value: 'Maintain' }));
      fixture.detectChanges();

      await component.saveValue();

      const [, body] = api.POST_ControlListValue.mock.calls[0];
      expect(body.portfolioIds).toEqual([]);
      expect(body).toEqual({ code: 'DIR-06', value: 'Maintain', description: undefined, displayOrder: 0, isActive: true, portfolioIds: [] });
    });

    it('creates with the ticked portfolios, driven through the rendered checkboxes', async () => {
      await openList();
      component.startCreateValue();
      component.valueForm.update(current => ({ ...current, value: 'Maintain' }));
      fixture.detectChanges();

      checkbox(2).click();
      fixture.detectChanges();
      expect(checkbox(2).checked).toBe(true);
      expect(root().querySelector('[data-testid="value-applies-to-hint"]')?.textContent).toContain('Offered only in the ticked portfolios');

      await component.saveValue();

      expect(api.POST_ControlListValue.mock.calls[0][1].portfolioIds).toEqual([2]);
    });

    it('pre-ticks the saved Applies to set on edit and sends the edited set (untick -> [], tick -> list)', async () => {
      await openList();

      component.startEditValue(maintain); // restricted to [2]
      fixture.detectChanges();
      expect(checkbox(1).checked).toBe(false);
      expect(checkbox(2).checked).toBe(true);

      checkbox(1).click();
      fixture.detectChanges();
      await component.saveValue();
      expect(api.PATCH_ControlListValue.mock.calls[0][1].portfolioIds).toEqual([2, 1]);

      component.startEditValue(both); // [1, 2]
      fixture.detectChanges();
      expect(checkbox(1).checked).toBe(true);
      expect(checkbox(2).checked).toBe(true);
      checkbox(1).click();
      checkbox(2).click();
      fixture.detectChanges();
      await component.saveValue();
      expect(api.PATCH_ControlListValue.mock.calls[1][1].portfolioIds).toEqual([]);
    });

    it('re-opening the modal on a different value does not carry the previous ticks over', async () => {
      await openList();
      component.startEditValue(maintain);
      fixture.detectChanges();
      expect(checkbox(2).checked).toBe(true);

      component.startCreateValue();
      fixture.detectChanges();

      expect(checkbox(1).checked).toBe(false);
      expect(checkbox(2).checked).toBe(false);
    });

    it('does not send an empty set for a value linked only to inactive portfolios that the admin did not touch (it would silently turn it into "all")', async () => {
      await openList();

      component.startEditValue(legacy); // appliesToAll = false, appliesTo = []
      fixture.detectChanges();
      expect(checkbox(1).checked).toBe(false);
      await component.saveValue();
      expect(api.PATCH_ControlListValue.mock.calls[0][1]).not.toHaveProperty('portfolioIds');

      // Ticking a portfolio is an explicit choice, so it IS sent.
      component.startEditValue(legacy);
      fixture.detectChanges();
      checkbox(1).click();
      await component.saveValue();
      expect(api.PATCH_ControlListValue.mock.calls[1][1].portfolioIds).toEqual([1]);
    });

    // ─── Portfolios call failure (design §6, S-4) ──────────────────────────────────────────────

    it('disables the Applies to field and the filter, with an inline note, when the portfolios call fails — and the page still works', async () => {
      await openList(fixtureValues, portfoliosDown);

      // Page otherwise works: categories + values rendered, no page-level error state.
      expect(root().querySelector('[data-testid="error-state"]')).toBeNull();
      expect(root().querySelectorAll('[data-testid="data-table-row"]')).toHaveLength(5);

      // Filter: rendered disabled, with the note beside it.
      expect(filterSelect().disabled).toBe(true);
      expect((fixture.debugElement.query(By.directive(Select)).nativeElement as HTMLElement).className).toMatch(/p-disabled/);
      expect(root().querySelector('[data-testid="portfolios-unavailable-note"]')?.textContent).toContain('could not be loaded');

      // Modal field: the fieldset is disabled and carries the note.
      component.startEditValue(maintain);
      fixture.detectChanges();
      const field = root().querySelector('[data-testid="value-applies-to-field"]') as HTMLFieldSetElement;
      expect(field.disabled).toBe(true);
      expect(root().querySelector('[data-testid="value-applies-to-unavailable"]')?.textContent).toContain('could not be loaded');
    });

    it('treats an unsuccessful portfolios response like a failure, and a successful one that lists none as an empty group (not a failure)', async () => {
      await openList(fixtureValues, () => Promise.resolve(fail(500, 'boom', 'InternalServerErrorException')));
      expect(component.portfoliosLoadFailed()).toBe(true);
      expect(filterSelect().disabled).toBe(true);

      TestBed.resetTestingModule();
      await openList(fixtureValues, () => Promise.resolve(ok([])));
      expect(component.portfoliosLoadFailed()).toBe(false);
      expect(filterSelect().disabled).toBeFalsy();
    });

    it('omits portfolioIds from create and edit payloads when the field is unavailable, so an edit can never wipe a restriction it could not show', async () => {
      await openList(fixtureValues, portfoliosDown);

      component.startEditValue(maintain);
      await component.saveValue();
      expect(api.PATCH_ControlListValue.mock.calls[0][1]).not.toHaveProperty('portfolioIds');

      component.startCreateValue();
      component.valueForm.update(current => ({ ...current, value: 'New one' }));
      await component.saveValue();
      expect(api.POST_ControlListValue.mock.calls[0][1]).not.toHaveProperty('portfolioIds');
    });
  });
});
