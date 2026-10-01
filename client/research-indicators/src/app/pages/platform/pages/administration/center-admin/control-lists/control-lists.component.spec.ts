import { Component, Input, WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Select } from 'primeng/select';
import ControlListsComponent from './control-lists.component';
import { Portfolio } from '@shared/interfaces/portfolio.interface';
import { ControlListCategory, ControlListPortfolioSummary } from '@shared/interfaces/control-lists.interface';
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

@Component({ selector: 'app-input', standalone: true, template: '' })
class InputStubComponent {
  @Input() signal!: WritableSignal<Record<string, unknown>>;
  @Input() optionValue = '';
  @Input() label = '';
  @Input() placeholder = '';
  @Input() isRequired = false;
  @Input() maxLength?: number;
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
  lists: [],
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
    DELETE_ControlListCategory: jest.fn()
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

    expect(api.PATCH_ControlListCategory).toHaveBeenCalledWith(7, { name: 'Updated name', description: undefined });
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
});
