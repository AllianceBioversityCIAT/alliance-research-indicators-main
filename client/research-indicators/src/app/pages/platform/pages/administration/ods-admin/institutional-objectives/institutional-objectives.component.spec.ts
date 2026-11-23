import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MultiSelect } from 'primeng/multiselect';
import { GlobalAlert } from '@shared/interfaces/global-alert.interface';
import {
  CarryForwardObjectivesResult,
  FrameworkContext,
  FrameworkObjective,
  FrameworkObjectiveYears,
  FrameworkView
} from '@shared/interfaces/strategy-framework.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import InstitutionalObjectivesComponent from './institutional-objectives.component';
import { linkedIndicatorsText } from './objective-view.util';

// @akili-spec institutional-performance/strategy-framework T-16 — R-STF-009, R-STF-010, R-STF-006, NFR-STF-004.
// KZ-015: the skeleton is asserted before the context resolves; carry forward, confirm, and the
// drawer are driven by clicks. The toast assertion is the exact string (not a mock that accepts any text).
// jsdom cannot prove the focus ring, contrast, drawer width, or animation (KZ-017, HITL T-17).

const ok = <T>(data: T): MainResponse<T> =>
  ({ data, status: 200, description: 'ok', timestamp: '', path: '', successfulRequest: true }) as MainResponse<T>;

const failed = (status: number, errorDetail: unknown): MainResponse<never> =>
  ({ data: undefined, status, description: 'error', timestamp: '', path: '', successfulRequest: false, errorDetail }) as unknown as MainResponse<never>;

const CONTEXT: FrameworkContext = {
  currentYear: 2026,
  defaultPortfolioId: 2,
  portfolios: [
    { id: 1, name: 'Portfolio 1', startYear: 2020, endYear: 2021, configured: false },
    { id: 2, name: 'Portfolio 2', startYear: 2026, endYear: 2030, configured: true }
  ]
};

const YEAR_ROWS = [
  { year: 2026, count: 28 },
  { year: 2027, count: 0 },
  { year: 2028, count: 1 },
  { year: 2029, count: 2 },
  { year: 2030, count: 4 }
];

const OBJECTIVES: FrameworkObjective[] = [
  {
    id: 10,
    portfolioId: 2,
    year: 2026,
    code: 'IOB-1',
    statement: 'Raise incomes',
    elements: [{ id: 31, code: '1.1.1', name: 'Yield' }],
    deletable: true,
    blockers: []
  },
  {
    id: 11,
    portfolioId: 2,
    year: 2026,
    code: 'IOB-2',
    statement: 'Cut loss',
    elements: [],
    deletable: false,
    blockers: [{ reason: 'kpis', count: 1, wayOut: 'Remove its 1 record in KPIs first.' }]
  }
];

const FRAMEWORK: FrameworkView = {
  portfolioId: 2,
  configured: true,
  levels: [
    { id: 1, depth: 1, name: 'Performance Area', pluralName: 'Performance Areas', shortLabel: 'AREA', isIndicatorLevel: false },
    { id: 2, depth: 2, name: 'Dimension', pluralName: 'Dimensions', shortLabel: 'DIMENSION', isIndicatorLevel: false },
    { id: 3, depth: 3, name: 'Indicator', pluralName: 'Indicators', shortLabel: 'INDICATOR', isIndicatorLevel: true }
  ],
  elements: [
    { id: 1, levelId: 1, depth: 1, code: '1', name: 'Area one', description: null, parentId: null, descendantCounts: {} },
    { id: 20, levelId: 2, depth: 2, code: '1.1', name: 'Dimension one', description: null, parentId: 1, descendantCounts: {} },
    { id: 31, levelId: 3, depth: 3, code: '1.1.1', name: 'Yield', description: null, parentId: 20, descendantCounts: {} },
    { id: 32, levelId: 3, depth: 3, code: '1.1.2', name: 'Loss', description: null, parentId: 20, descendantCounts: {} }
  ]
};

const COPIED: CarryForwardObjectivesResult = { fromYear: 2026, toYear: 2027, copied: 28 };

describe('InstitutionalObjectivesComponent', () => {
  let fixture: ComponentFixture<InstitutionalObjectivesComponent>;
  let component: InstitutionalObjectivesComponent;
  let defaultYear: number;
  let api: {
    GET_StrategyFrameworkContext: jest.Mock;
    GET_StrategyFrameworkObjectiveYears: jest.Mock;
    GET_StrategyFramework: jest.Mock;
    GET_StrategyFrameworkObjectives: jest.Mock;
    GET_StrategyFrameworkCodeProposal: jest.Mock;
    POST_StrategyFrameworkCarryForward: jest.Mock;
    POST_StrategyFrameworkObjective: jest.Mock;
    PATCH_StrategyFrameworkObjective: jest.Mock;
    DELETE_StrategyFrameworkObjective: jest.Mock;
  };
  let actions: { showToast: jest.Mock; showGlobalAlert: jest.Mock; handleBadRequest: jest.Mock };

  const root = () => fixture.nativeElement as HTMLElement;
  const q = (testId: string) => root().querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
  const button = (testId: string) => {
    const inner = q(testId)?.querySelector('button');
    if (!(inner instanceof HTMLButtonElement)) throw new Error(`missing button ${testId}`);
    return inner;
  };
  const settle = async () => {
    for (let turn = 0; turn < 6; turn += 1) {
      await fixture.whenStable();
      fixture.detectChanges();
    }
  };
  const create = () => {
    fixture = TestBed.createComponent(InstitutionalObjectivesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };
  const pickYear = async (year: number) => {
    fixture.debugElement.query(By.css('[data-testid="year-select"]')).triggerEventHandler('onChange', { value: year });
    await settle();
  };
  const lastAlert = (): GlobalAlert => actions.showGlobalAlert.mock.calls.at(-1)?.[0] as GlobalAlert;

  beforeEach(async () => {
    defaultYear = 2026;
    api = {
      GET_StrategyFrameworkContext: jest.fn().mockResolvedValue(ok(CONTEXT)),
      GET_StrategyFrameworkObjectiveYears: jest.fn().mockImplementation(
        () => Promise.resolve(ok({ years: YEAR_ROWS, defaultYear } satisfies FrameworkObjectiveYears))
      ),
      GET_StrategyFramework: jest.fn().mockResolvedValue(ok(FRAMEWORK)),
      GET_StrategyFrameworkObjectives: jest.fn().mockImplementation((_portfolioId: number, year: number) => Promise.resolve(ok(year === 2026 ? OBJECTIVES : []))),
      GET_StrategyFrameworkCodeProposal: jest.fn().mockResolvedValue(ok({ code: 'IOB-29' })),
      POST_StrategyFrameworkCarryForward: jest.fn().mockResolvedValue(ok(COPIED)),
      POST_StrategyFrameworkObjective: jest.fn().mockResolvedValue(ok(OBJECTIVES[0])),
      PATCH_StrategyFrameworkObjective: jest.fn().mockResolvedValue(ok(OBJECTIVES[0])),
      DELETE_StrategyFrameworkObjective: jest.fn().mockResolvedValue(ok({ id: 10 }))
    };
    actions = { showToast: jest.fn(), showGlobalAlert: jest.fn(), handleBadRequest: jest.fn() };
    await TestBed.configureTestingModule({
      imports: [InstitutionalObjectivesComponent],
      providers: [provideNoopAnimations(), { provide: ApiService, useValue: api }, { provide: ActionsService, useValue: actions }]
    }).compileComponents();
  });

  let restoreMedia: (() => void) | null = null;

  afterEach(() => {
    fixture?.destroy();
    document.querySelectorAll('.p-drawer, .p-drawer-mask, .p-overlay-mask').forEach(node => node.remove());
    restoreMedia?.();
    restoreMedia = null;
  });

  it('shows a skeleton, then the year label and the server defaultYear', async () => {
    let resolveContext: (value: MainResponse<FrameworkContext>) => void = () => undefined;
    api.GET_StrategyFrameworkContext.mockReturnValue(new Promise(resolve => (resolveContext = resolve)));
    create();

    expect(root().querySelector('app-custom-progress-bar')).not.toBeNull();
    expect(q('year-select')?.textContent).not.toContain('2026 · 28 objectives');

    resolveContext(ok(CONTEXT));
    await settle();

    expect(q('eyebrow')?.textContent?.trim()).toBe('ADMIN · ODS');
    expect(q('page-title')?.textContent?.trim()).toBe('Institutional Objectives');
    expect(component.year()).toBe(2026);
    expect(component.defaultYear()).toBe(2026);
    expect(q('year-select')?.textContent).toContain('2026 · 28 objectives');
    expect(root().textContent).toContain('IOB-1');
    expect(root().querySelector('[data-testid="cell-code"] span')?.textContent?.trim()).toBe('IOB-1');
    expect(root().textContent).toContain('Raise incomes');
    expect(root().textContent).toContain('1.1.1 Yield');
    expect(button('carry-forward').textContent).toContain('Carry forward to 2027');
    expect(button('carry-forward').disabled).toBe(false);
  });

  it('selects defaultYear when it is not the machine year', async () => {
    defaultYear = 2029;
    create();
    await settle();

    expect(component.year()).toBe(2029);
    expect(q('year-select')?.textContent).toContain('2029 · 2 objectives');
  });

  it('disables carry forward when the selected year is the portfolio last year', async () => {
    create();
    await settle();

    expect(button('carry-forward').disabled).toBe(false);
    await pickYear(2030);

    const carry = button('carry-forward');
    expect(carry.textContent).toContain('Carry forward to 2031');
    expect(carry.disabled).toBe(true);
    carry.click();
    expect(actions.showGlobalAlert).not.toHaveBeenCalled();
    expect(api.POST_StrategyFrameworkCarryForward).not.toHaveBeenCalled();
  });

  it('disables carry forward on an empty year', async () => {
    create();
    await settle();
    await pickYear(2027);

    const carry = button('carry-forward');
    expect(carry.textContent).toContain('Carry forward to 2028');
    expect(carry.disabled).toBe(true);
    carry.click();
    expect(api.POST_StrategyFrameworkCarryForward).not.toHaveBeenCalled();
  });

  it('confirms carry forward and toasts the exact copied sentence', async () => {
    create();
    await settle();

    button('carry-forward').click();
    await settle();

    expect(api.POST_StrategyFrameworkCarryForward).not.toHaveBeenCalled();
    const alert = lastAlert();
    expect(alert.confirmCallback?.label).toBe('Carry forward');
    expect(alert.detail).toContain('Copy 28 objectives from 2026 to 2027?');
    await alert.confirmCallback?.event?.();
    await settle();

    expect(api.POST_StrategyFrameworkCarryForward).toHaveBeenCalledTimes(1);
    expect(api.POST_StrategyFrameworkCarryForward).toHaveBeenCalledWith({ portfolioId: 2, fromYear: 2026 });
    expect(actions.showToast).toHaveBeenCalledTimes(1);
    expect(actions.showToast.mock.calls[0][0]).toEqual({
      severity: 'success',
      summary: 'Carry forward',
      detail: '28 objectives copied to 2027; 2026 is unchanged'
    });
    expect(actions.handleBadRequest).not.toHaveBeenCalled();
  });

  it('shows a carry-forward 409 inline and does not toast', async () => {
    api.POST_StrategyFrameworkCarryForward.mockResolvedValue(failed(409, { description: '2027 already has objectives' }));
    create();
    await settle();

    button('carry-forward').click();
    await settle();
    const alerts = actions.showGlobalAlert.mock.calls.length;
    await lastAlert().confirmCallback?.event?.();
    await settle();

    expect(q('carry-forward-error')?.textContent?.trim()).toBe('2027 already has objectives');
    expect(actions.showToast).not.toHaveBeenCalled();
    expect(actions.showGlobalAlert).toHaveBeenCalledTimes(alerts);
    expect(actions.handleBadRequest).not.toHaveBeenCalled();
  });

  it('opens the form with no owner, indicator options only, and returns focus', async () => {
    create();
    await settle();

    expect(document.querySelector('[data-testid="objective-form"]')).toBeNull();
    const opener = button('add-objective');
    opener.focus();
    opener.click();
    await settle();

    const opened = document.querySelector('[data-testid="objective-form"]') as HTMLElement;
    expect(opened.textContent?.toLowerCase()).not.toContain('owner');
    expect(opened.querySelector('label[for="objectiveIndicators"]')?.textContent?.trim()).toBe('Linked indicators');
    expect((document.querySelector('#objectiveCode') as HTMLInputElement).value).toBe('IOB-29');

    const multi = fixture.debugElement.query(By.directive(MultiSelect)).componentInstance as MultiSelect;
    const labels = (multi.options as { items: { label: string; value: number }[] }[]).flatMap(group => group.items.map(item => item.label));
    expect(labels).toEqual(['1.1.1 · Yield', '1.1.2 · Loss']);
    expect(multi.options as { label: string }[]).toEqual([expect.objectContaining({ label: '1 · Area one' })]);

    const code = document.querySelector('#objectiveCode') as HTMLInputElement;
    const statement = document.querySelector('#objectiveStatement') as HTMLTextAreaElement;
    const save = document.querySelector('[data-testid="objective-save"] button') as HTMLButtonElement;
    statement.focus();
    save.focus();
    // A real focus() is what sets relatedTarget to Save. A synthetic FocusEvent drops it in jsdom,
    // and the trap then treats the event as coming from outside.
    opened.querySelector<HTMLElement>('[data-pc-section="lastfocusableelement"]')?.focus();
    expect(document.activeElement).toBe(code);

    const cancel = document.querySelector('[data-testid="objective-cancel"] button') as HTMLButtonElement;
    cancel.click();
    await settle();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(opener);
    expect(document.querySelector('[data-testid="objective-form"]')).toBeNull();
  });

  it('saves a new objective without an owner field', async () => {
    create();
    await settle();
    button('add-objective').click();
    await settle();

    const statement = document.querySelector('#objectiveStatement') as HTMLTextAreaElement;
    statement.value = 'A new objective';
    statement.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const panel = fixture.debugElement.query(By.css('app-objective-panel')).componentInstance as {
      form: { controls: { elementIds: { setValue: (value: number[]) => void } } };
    };
    panel.form.controls.elementIds.setValue([31]);
    (document.querySelector('[data-testid="objective-save"] button') as HTMLButtonElement).click();
    await settle();

    expect(api.POST_StrategyFrameworkObjective).toHaveBeenCalledWith({
      portfolioId: 2,
      year: 2026,
      code: 'IOB-29',
      statement: 'A new objective',
      elementIds: [31]
    });
    const body = api.POST_StrategyFrameworkObjective.mock.calls[0][0] as Record<string, unknown>;
    expect(body['owner']).toBeUndefined();
    expect(body['responsibleCarnets']).toBeUndefined();
  });

  it('follows deletable: a blocked objective is not deleted, a free one confirms then deletes', async () => {
    create();
    await settle();

    const blocked = root().querySelector('[data-testid="delete-objective"][data-objective-id="11"]') as HTMLButtonElement;
    expect(blocked.getAttribute('aria-disabled')).toBe('true');
    expect(blocked.querySelector('.atc-red-1')).toBeNull();
    expect(blocked.querySelector('.atc-grey-700')).not.toBeNull();
    expect(root().querySelector('#objective-blocker-11')?.textContent?.trim()).toBe('Remove its 1 record in KPIs first.');
    blocked.click();
    await settle();
    expect(api.DELETE_StrategyFrameworkObjective).not.toHaveBeenCalled();
    expect(lastAlert().confirmCallback?.label).toBe('Close');
    expect(lastAlert().detail).toContain('Remove its 1 record in KPIs first.');

    const free = root().querySelector('[data-testid="delete-objective"][data-objective-id="10"]') as HTMLButtonElement;
    expect(free.getAttribute('aria-disabled')).toBe('false');
    expect(free.querySelector('.atc-red-1')).not.toBeNull();
    free.click();
    await settle();
    expect(lastAlert().detail).toBe('Delete Institutional objective IOB-1?');
    expect(lastAlert().confirmCallback?.label).toBe('Delete');
    await lastAlert().confirmCallback?.event?.();
    await settle();
    expect(api.DELETE_StrategyFrameworkObjective).toHaveBeenCalledTimes(1);
    expect(api.DELETE_StrategyFrameworkObjective).toHaveBeenCalledWith(10);
    expect(actions.showToast).not.toHaveBeenCalled();
  });

  it('heads the open objective and deletes from the panel through the same confirm', async () => {
    create();
    await settle();

    (root().querySelector('[data-testid="edit-objective"][data-objective-id="11"]') as HTMLButtonElement).click();
    await settle();
    expect(document.querySelector('[data-testid="panel-level"]')?.textContent?.trim()).toBe('INSTITUTIONAL OBJECTIVE');
    expect(document.querySelector('[data-testid="panel-title"]')?.textContent?.trim()).toBe('IOB-2 · 2026');
    const blocked = document.querySelector('[data-testid="objective-panel-delete"] button') as HTMLButtonElement;
    expect(blocked.getAttribute('aria-disabled')).toBe('true');
    expect(blocked.classList.contains('p-button-outlined')).toBe(true);
    expect(blocked.classList.contains('p-button-danger')).toBe(false);
    expect(document.querySelector('#objective-panel-blocker-11')?.textContent?.trim()).toBe('Remove its 1 record in KPIs first.');
    blocked.click();
    await settle();
    expect(api.DELETE_StrategyFrameworkObjective).not.toHaveBeenCalled();
    expect(lastAlert().confirmCallback?.label).toBe('Close');
    expect(lastAlert().detail).toContain('Remove its 1 record in KPIs first.');

    (document.querySelector('[data-testid="objective-cancel"] button') as HTMLButtonElement).click();
    await settle();
    (root().querySelector('[data-testid="edit-objective"][data-objective-id="10"]') as HTMLButtonElement).click();
    await settle();
    expect(document.querySelector('[data-testid="panel-title"]')?.textContent?.trim()).toBe('IOB-1 · 2026');
    const free = document.querySelector('[data-testid="objective-panel-delete"] button') as HTMLButtonElement;
    expect(free.getAttribute('aria-disabled')).toBe('false');
    expect(free.classList.contains('p-button-outlined')).toBe(true);
    expect(free.classList.contains('p-button-danger')).toBe(true);
    free.click();
    await settle();
    expect(lastAlert().detail).toBe('Delete Institutional objective IOB-1?');
    expect(lastAlert().confirmCallback?.label).toBe('Delete');
    await lastAlert().confirmCallback?.event?.();
    await settle();
    expect(api.DELETE_StrategyFrameworkObjective).toHaveBeenCalledTimes(1);
    expect(api.DELETE_StrategyFrameworkObjective).toHaveBeenCalledWith(10);
  });

  it('shows a delete 409 inline and does not toast', async () => {
    api.DELETE_StrategyFrameworkObjective.mockResolvedValue(failed(409, { description: 'Cannot delete IOB-1: linked by 1 record.' }));
    create();
    await settle();

    (root().querySelector('[data-testid="delete-objective"][data-objective-id="10"]') as HTMLButtonElement).click();
    await settle();
    await lastAlert().confirmCallback?.event?.();
    await settle();

    expect(q('delete-error')?.textContent?.trim()).toBe('Cannot delete IOB-1: linked by 1 record.');
    expect(actions.showToast).not.toHaveBeenCalled();
    expect(actions.handleBadRequest).not.toHaveBeenCalled();
  });

  it('puts each linked indicator on its own line', () => {
    expect(
      linkedIndicatorsText([
        { code: '1.1.1', name: 'Process efficiency' },
        { code: '1.1.2', name: 'Loss' }
      ])
    ).toBe('1.1.1 Process efficiency\n1.1.2 Loss');
  });

  it('closes only the Year select on Escape, then the drawer, and returns focus to the opener', async () => {
    restoreMedia = installMatchMedia().restore;
    create();
    await settle();
    const opener = button('add-objective');
    opener.focus();
    opener.click();
    await settle();

    const statement = document.querySelector('#objectiveStatement') as HTMLTextAreaElement;
    statement.value = 'Unsaved statement';
    statement.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    const year = document.querySelector('[data-testid="objective-year"]') as HTMLElement;
    year.click();
    await settle();
    expect(document.querySelector('.p-select-overlay')).not.toBeNull();
    const yearTarget = document.querySelector('[data-testid="objective-year"] [role="combobox"]') ?? year;
    pressEscape(yearTarget);
    await settle();

    expect(document.querySelector('[data-testid="objective-form"]')).not.toBeNull();
    expect(document.querySelector('.p-select-overlay')).toBeNull();
    expect((document.querySelector('#objectiveStatement') as HTMLTextAreaElement).value).toBe('Unsaved statement');

    const indicators = document.querySelector('[data-testid="objective-indicators"]') as HTMLElement;
    indicators.click();
    await settle();
    expect(document.querySelector('.p-multiselect-overlay')).not.toBeNull();
    const filter = document.querySelector('.p-multiselect-filter') ?? document.querySelector('.p-multiselect-overlay [role="searchbox"]') ?? indicators;
    pressEscape(filter);
    await settle();
    expect(document.querySelector('[data-testid="objective-form"]')).not.toBeNull();
    expect(document.querySelector('.p-multiselect-overlay')).toBeNull();
    expect((document.querySelector('#objectiveStatement') as HTMLTextAreaElement).value).toBe('Unsaved statement');

    pressEscape(document.querySelector('#objectiveCode') as HTMLElement);
    await settle();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(document.querySelector('[data-testid="objective-form"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});

function pressEscape(target: EventTarget): void {
  const event = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true });
  Object.defineProperty(event, 'which', { configurable: true, get: () => 27 });
  target.dispatchEvent(event);
}

function installMatchMedia(): { restore: () => void } {
  if (typeof Element.prototype.scrollIntoView !== 'function') Element.prototype.scrollIntoView = () => undefined;
  const original = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
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
  return {
    restore: () => {
      if (original) Object.defineProperty(window, 'matchMedia', original);
      else delete (window as Partial<Window>).matchMedia;
    }
  };
}
