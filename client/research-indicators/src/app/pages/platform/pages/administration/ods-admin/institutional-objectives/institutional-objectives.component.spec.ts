import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MultiSelect } from 'primeng/multiselect';
import { Select } from 'primeng/select';
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
import { CacheService } from '@shared/services/cache/cache.service';
import { ObjectivePanelComponent } from './components/objective-panel/objective-panel.component';
import InstitutionalObjectivesComponent from './institutional-objectives.component';
import * as xlsxExportUtil from '@shared/utils/xlsx-export.util';
import { linkedIndicatorsText } from './objective-view.util';

// @akili-spec institutional-performance/strategy-framework T-20 — R-STF-009, R-STF-010, R-STF-016, NFR-STF-004.
// KZ-015: row clicks, Enter, select changes, buttons and the alert callbacks drive the transition.
// KZ-001: refresh in place compares the <table> element, not its text.
// KZ-017: jsdom cannot judge viewport fit, scroll, colour, or real Tab order. The column height binding is not that measurement.

const ok = <T>(data: T): MainResponse<T> =>
  ({ data, status: 200, description: 'ok', timestamp: '', path: '', successfulRequest: true }) as MainResponse<T>;

const failed = (status: number, errorDetail: unknown): MainResponse<never> =>
  ({
    data: undefined,
    status,
    description: 'error',
    timestamp: '',
    path: '',
    successfulRequest: false,
    errorDetail
  }) as unknown as MainResponse<never>;

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
  const chipTexts = () => Array.from(root().querySelectorAll('[data-testid="count-chip"]')).map(chip => chip.textContent?.trim());
  const button = (testId: string) => {
    const inner = q(testId)?.querySelector('button');
    if (!(inner instanceof HTMLButtonElement)) throw new Error(`missing button ${testId}`);
    return inner;
  };
  const settle = async () => {
    for (let turn = 0; turn < 8; turn += 1) {
      await fixture.whenStable();
      fixture.detectChanges();
    }
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();
  };
  const create = () => {
    fixture = TestBed.createComponent(InstitutionalObjectivesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };
  const row = (id: number) => root().querySelector(`[data-testid="data-table-row"][data-row-key="${id}"]`) as HTMLElement;
  const clickRow = async (id: number) => {
    row(id).click();
    await settle();
  };
  const pressEnter = async (id: number) => {
    row(id).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle();
  };
  const typeInto = async (selector: string, value: string) => {
    const field = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const lastAlert = (): GlobalAlert => actions.showGlobalAlert.mock.calls.at(-1)?.[0] as GlobalAlert;
  const answer = async (label: 'Discard' | 'Keep editing') => {
    const alert = lastAlert();
    const callback = label === 'Discard' ? alert.confirmCallback : alert.cancelCallback;
    callback?.event?.();
    await settle();
  };
  const statement = () => (document.querySelector('#objectiveStatement') as HTMLTextAreaElement).value;
  const selectLabel = (testId: string) => q(testId)?.querySelector('.p-select-label')?.textContent ?? '';
  const pickOption = async (testId: string, match: (option: { id?: number; year?: number }) => boolean) => {
    const select = fixture.debugElement.query(By.css(`[data-testid="${testId}"]`)).componentInstance as Select;
    const option = (select.options as { id?: number; year?: number }[]).find(match);
    select.onOptionSelect(new Event('click'), option);
    await settle();
  };

  beforeEach(async () => {
    defaultYear = 2026;
    api = {
      GET_StrategyFrameworkContext: jest.fn().mockResolvedValue(ok(CONTEXT)),
      GET_StrategyFrameworkObjectiveYears: jest
        .fn()
        .mockImplementation(() => Promise.resolve(ok({ years: YEAR_ROWS, defaultYear } satisfies FrameworkObjectiveYears))),
      GET_StrategyFramework: jest.fn().mockResolvedValue(ok(FRAMEWORK)),
      GET_StrategyFrameworkObjectives: jest
        .fn()
        .mockImplementation((_portfolioId: number, year: number) => Promise.resolve(ok(year === 2026 ? OBJECTIVES : []))),
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

  afterEach(() => {
    fixture?.destroy();
  });

  it('shows a skeleton, then the year label and the server defaultYear', async () => {
    let resolveContext: (value: MainResponse<FrameworkContext>) => void = () => undefined;
    api.GET_StrategyFrameworkContext.mockReturnValue(new Promise(resolve => (resolveContext = resolve)));
    create();

    expect(root().querySelector('app-custom-progress-bar')).not.toBeNull();
    expect(q('year-select')).toBeNull();

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
    expect(button('add-objective').textContent?.replace(/\s+/g, ' ').trim()).toBe('Add objective');
    expect(button('carry-forward').textContent).toContain('Carry forward to 2027');
    expect(button('carry-forward').disabled).toBe(false);
  });

  it('binds the column height from the navbar and header signals', async () => {
    const cache = TestBed.inject(CacheService);
    cache.navbarHeight.set(51);
    cache.headerHeight.set(60.5);
    create();
    await settle();

    expect(q('objectives-page')?.style.getPropertyValue('--objectives-column-height').trim()).toBe('calc(100vh - 111.5px)');
    expect(q('objectives-page')?.classList.contains('pt-3')).toBe(false);
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
    fixture.debugElement.query(By.css('[data-testid="year-select"]')).triggerEventHandler('onChange', { value: 2030 });
    await settle();

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
    expect(q('objectives-list')?.contains(q('count-chips'))).toBe(true);
    fixture.debugElement.query(By.css('[data-testid="year-select"]')).triggerEventHandler('onChange', { value: 2027 });
    await settle();

    expect(q('count-chips')).toBeNull();
    expect(q('objectives-search')).not.toBeNull();
    const carry = button('carry-forward');
    expect(carry.textContent).toContain('Carry forward to 2028');
    expect(carry.disabled).toBe(true);
    carry.click();
    expect(api.POST_StrategyFrameworkCarryForward).not.toHaveBeenCalled();
  });

  it('confirms carry forward and toasts the exact copied sentence', async () => {
    create();
    await settle();
    const table = root().querySelector('table');

    button('carry-forward').click();
    await settle();

    expect(api.POST_StrategyFrameworkCarryForward).not.toHaveBeenCalled();
    const alert = lastAlert();
    expect(alert.summary).toBe('Carry forward');
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
    expect(root().querySelector('table')).toBe(table);
    expect(root().querySelector('app-custom-progress-bar')).toBeNull();
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

  it('shows the objective empty rows from the loaded year, then hides them on select', async () => {
    const shared: FrameworkObjective[] = [
      {
        id: 10,
        portfolioId: 2,
        year: 2026,
        code: 'IOB-1',
        statement: 'Raise incomes',
        elements: [
          { id: 31, code: '1.1.1', name: 'Yield' },
          { id: 32, code: '1.1.2', name: 'Loss' }
        ],
        deletable: true,
        blockers: []
      },
      {
        id: 11,
        portfolioId: 2,
        year: 2026,
        code: 'IOB-2',
        statement: 'Cut loss',
        elements: [{ id: 31, code: '1.1.1', name: 'Yield' }],
        deletable: true,
        blockers: []
      }
    ];
    api.GET_StrategyFrameworkObjectiveYears.mockResolvedValue(
      ok({
        years: [
          { year: 2026, count: shared.length },
          { year: 2027, count: 0 },
          { year: 2028, count: 1 }
        ],
        defaultYear: 2026
      })
    );
    api.GET_StrategyFrameworkObjectives.mockImplementation((_portfolioId: number, year: number) => Promise.resolve(ok(year === 2026 ? shared : [])));
    create();
    await settle();

    const emptyRows = () => Array.from(q('panel-empty')?.querySelectorAll('[data-testid="empty-level-row"]') ?? []) as HTMLElement[];
    expect(q('panel-empty')?.textContent).toContain('Explore the institutional objectives');
    expect(q('panel-empty')?.textContent).toContain('Select an objective to see its statement, year and linked indicators.');
    expect(selectLabel('year-select')).toContain('2026 · 2 objectives');
    expect(emptyRows()).toHaveLength(3);
    expect(emptyRows().map(item => item.querySelector('.ods-empty-panel__name')?.textContent?.trim())).toEqual([
      '2 Objectives · 2026',
      '2 Linked indicators',
      'Carry forward to 2027'
    ]);
    expect(emptyRows().map(item => item.querySelector('.ods-empty-panel__hint')?.textContent?.trim())).toEqual([
      'Institutional objectives for the selected year.',
      "Framework indicators linked to this year's objectives.",
      "Copy this year's objectives into the next year."
    ]);
    expect(emptyRows().map(item => item.querySelector('i')?.className)).toEqual(['pi pi-flag', 'pi pi-chart-bar', 'pi pi-copy']);
    expect(q('panel-empty')?.querySelector('.ods-empty-panel__tile--accent')).toBeNull();
    expect(q('panel-empty')?.querySelector('button')).toBeNull();
    for (const item of emptyRows()) {
      expect(item.hasAttribute('tabindex')).toBe(false);
      expect(item.querySelector('button, [tabindex]')).toBeNull();
    }
    q('panel-empty')
      ?.querySelectorAll('i')
      .forEach(icon => expect(icon.getAttribute('aria-hidden')).toBe('true'));

    await clickRow(10);
    expect(q('panel-empty')).toBeNull();
    expect(emptyRows()).toHaveLength(0);

    await pickOption('year-select', option => option.year === 2028);
    expect(component.year()).toBe(2028);
    expect(selectLabel('year-select')).toContain('2028 · 1 objective');
    expect(q('panel-empty')?.textContent).toContain('1 Objectives · 2028');
    expect(q('panel-empty')?.textContent).toContain('0 Linked indicators');
    expect(q('panel-empty')?.textContent).toContain('Carry forward to 2029');
  });

  it('fills the panel from a row click and from Enter, and shows the empty state first', async () => {
    create();
    await settle();

    expect(q('panel-empty')?.textContent).toContain('Explore the institutional objectives');
    expect(q('panel-empty')?.textContent).toContain('Select an objective to see its statement, year and linked indicators.');
    expect(q('panel-empty')?.querySelector('i')?.classList.contains('pi-flag')).toBe(true);
    expect(q('panel-empty')?.querySelector('i')?.getAttribute('aria-hidden')).toBe('true');
    expect(q('panel-empty')?.querySelector('button')).toBeNull();
    expect(document.querySelector('[data-testid="objective-form"]')).toBeNull();
    expect(root().querySelector('[data-testid="edit-objective"]')).toBeNull();
    expect(root().querySelector('[data-testid="delete-objective"]')).toBeNull();
    expect(root().querySelector('[data-testid="column-header-actions"]')).toBeNull();
    // Concatenated so this absence check is not a use of the retired overlay tag.
    expect(document.querySelector('p-' + 'drawer')).toBeNull();
    expect(q('side-panel')?.getAttribute('aria-label')).toBe('Objective details');
    expect(q('objectives-list')?.closest('.side-panel-layout__list')?.classList.contains('side-panel-layout__card')).toBe(true);

    row(10).focus();
    await clickRow(10);
    expect(document.querySelector('[data-testid="panel-level"]')?.textContent?.trim()).toBe('INSTITUTIONAL OBJECTIVE');
    expect(document.querySelector('[data-testid="panel-title"]')?.textContent?.trim()).toBe('IOB-1 · 2026');
    expect(statement()).toBe('Raise incomes');
    expect(row(10).getAttribute('aria-selected')).toBe('true');
    // Clicking a focused row must not move focus into the form. jsdom does not
    // focus a tabindex row on click the way a browser does (KZ-017).
    expect(document.activeElement).toBe(row(10));
    expect(document.activeElement).not.toBe(document.querySelector('#objectiveCode'));
    expect(q('panel-empty')).toBeNull();

    await pressEnter(11);
    expect(statement()).toBe('Cut loss');
    expect(row(11).getAttribute('aria-selected')).toBe('true');
    expect(row(10).getAttribute('aria-selected')).toBe('false');
    // Concatenated so this absence check is not a use of the retired overlay tag.
    expect(document.querySelector('p-' + 'drawer')).toBeNull();
  });

  it('opens create with no owner, focuses the code, and returns focus to the button on Cancel', async () => {
    create();
    await settle();

    const opener = button('add-objective');
    opener.focus();
    opener.click();
    await settle();

    const opened = document.querySelector('[data-testid="objective-form"]') as HTMLElement;
    expect(opened.textContent?.toLowerCase()).not.toContain('owner');
    expect(opened.querySelector('label[for="objectiveIndicators"]')?.textContent?.trim()).toBe('Linked indicators');
    expect((document.querySelector('#objectiveCode') as HTMLInputElement).value).toBe('IOB-29');
    expect(document.activeElement).toBe(document.querySelector('#objectiveCode'));
    expect(q('panel-empty')).toBeNull();
    expect(document.querySelector('[data-testid="panel-title"]')?.textContent?.trim()).toBe('New institutional objective');
    expect(document.querySelector('[data-testid="objective-panel-delete"]')).toBeNull();
    expect(row(10).getAttribute('aria-selected')).toBe('false');

    const multi = fixture.debugElement.query(By.directive(MultiSelect)).componentInstance as MultiSelect;
    const labels = (multi.options as { items: { label: string; value: number }[] }[]).flatMap(group => group.items.map(item => item.label));
    expect(labels).toEqual(['1.1.1 · Yield', '1.1.2 · Loss']);
    expect(multi.options as { label: string }[]).toEqual([expect.objectContaining({ label: '1 · Area one' })]);

    (document.querySelector('[data-testid="objective-cancel"] button') as HTMLButtonElement).click();
    await settle();
    expect(document.activeElement).toBe(opener);
    expect(document.querySelector('[data-testid="objective-form"]')).toBeNull();
  });

  it('saves a new objective without an owner field', async () => {
    create();
    await settle();
    button('add-objective').click();
    await settle();

    await typeInto('#objectiveStatement', 'A new objective');
    const panel = fixture.debugElement.query(By.directive(ObjectivePanelComponent)).componentInstance as ObjectivePanelComponent;
    panel.form.controls.elementIds.setValue([31]);
    fixture.detectChanges();
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

  it('saves in place, keeps the row selected, and does not replace the table element', async () => {
    create();
    await settle();
    await clickRow(10);
    const table = root().querySelector('table');
    expect(table).not.toBeNull();
    await typeInto('#objectiveStatement', 'Raise incomes updated');
    const saved = { ...OBJECTIVES[0], statement: 'Raise incomes updated' };
    api.PATCH_StrategyFrameworkObjective.mockResolvedValue(ok(saved));
    api.GET_StrategyFrameworkObjectives.mockResolvedValue(ok([saved, OBJECTIVES[1]]));

    (document.querySelector('[data-testid="objective-save"] button') as HTMLButtonElement).click();
    await settle();

    expect(api.PATCH_StrategyFrameworkObjective).toHaveBeenCalledWith(10, {
      year: 2026,
      code: 'IOB-1',
      statement: 'Raise incomes updated',
      elementIds: [31]
    });
    expect(actions.showToast).toHaveBeenCalledWith({ severity: 'success', summary: 'Saved', detail: 'IOB-1 saved' });
    expect(root().querySelector('table')).toBe(table);
    expect(root().querySelector('app-custom-progress-bar')).toBeNull();
    expect(row(10).getAttribute('aria-selected')).toBe('true');
    expect(row(10).querySelector('[data-testid="cell-statement"]')?.textContent?.trim()).toBe('Raise incomes updated');
    expect(statement()).toBe('Raise incomes updated');
  });

  it('does not ask to discard a statement that was just saved', async () => {
    create();
    await settle();
    await clickRow(10);
    await typeInto('#objectiveStatement', 'Raise incomes updated');
    const saved = { ...OBJECTIVES[0], statement: 'Raise incomes updated' };
    api.PATCH_StrategyFrameworkObjective.mockResolvedValue(ok(saved));
    api.GET_StrategyFrameworkObjectives.mockResolvedValue(ok([saved, OBJECTIVES[1]]));
    (document.querySelector('[data-testid="objective-save"] button') as HTMLButtonElement).click();
    await settle();
    actions.showGlobalAlert.mockClear();

    await clickRow(11);

    expect(actions.showGlobalAlert).not.toHaveBeenCalled();
    expect(statement()).toBe('Cut loss');
  });

  it('keeps the saved statement when Cancel follows Save', async () => {
    create();
    await settle();
    await clickRow(10);
    await typeInto('#objectiveStatement', 'Raise incomes updated');
    const saved = { ...OBJECTIVES[0], statement: 'Raise incomes updated' };
    api.PATCH_StrategyFrameworkObjective.mockResolvedValue(ok(saved));
    api.GET_StrategyFrameworkObjectives.mockResolvedValue(ok([saved, OBJECTIVES[1]]));
    (document.querySelector('[data-testid="objective-save"] button') as HTMLButtonElement).click();
    await settle();

    (document.querySelector('[data-testid="objective-cancel"] button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(statement()).toBe('Raise incomes updated');
    expect(row(10).getAttribute('aria-selected')).toBe('true');
  });

  it('keeps a created objective when Cancel follows Save', async () => {
    const created: FrameworkObjective = {
      id: 40,
      portfolioId: 2,
      year: 2026,
      code: 'IOB-29',
      statement: 'A new objective',
      elements: [],
      deletable: true,
      blockers: []
    };
    api.POST_StrategyFrameworkObjective.mockResolvedValue(ok(created));
    create();
    await settle();
    button('add-objective').click();
    await settle();
    await typeInto('#objectiveStatement', 'A new objective');
    api.GET_StrategyFrameworkObjectives.mockResolvedValue(ok([...OBJECTIVES, created]));

    (document.querySelector('[data-testid="objective-save"] button') as HTMLButtonElement).click();
    await settle();
    (document.querySelector('[data-testid="objective-cancel"] button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(statement()).toBe('A new objective');
    expect((document.querySelector('#objectiveCode') as HTMLInputElement).value).toBe('IOB-29');
    expect(document.querySelector('[data-testid="panel-title"]')?.textContent?.trim()).toBe('IOB-29 · 2026');
    expect(row(40).getAttribute('aria-selected')).toBe('true');
    expect(actions.showGlobalAlert).not.toHaveBeenCalled();
  });

  it('keeps text typed while a save is in flight and still asks before leaving', async () => {
    create();
    await settle();
    await clickRow(10);
    await typeInto('#objectiveStatement', 'X');
    let resolvePatch: (value: MainResponse<FrameworkObjective>) => void = () => undefined;
    api.PATCH_StrategyFrameworkObjective.mockReturnValue(new Promise(resolve => (resolvePatch = resolve)));
    api.GET_StrategyFrameworkObjectives.mockResolvedValue(ok([{ ...OBJECTIVES[0], statement: 'X' }, OBJECTIVES[1]]));
    (document.querySelector('[data-testid="objective-save"] button') as HTMLButtonElement).click();
    await typeInto('#objectiveStatement', 'XY');
    resolvePatch(ok({ ...OBJECTIVES[0], statement: 'X' }));
    await settle();

    expect(statement()).toBe('XY');
    actions.showGlobalAlert.mockClear();
    await clickRow(11);
    expect(lastAlert().summary).toBe('Discard changes?');
    expect(statement()).toBe('XY');
  });

  it('keeps text typed while a create is saving, and edits the new id after refresh', async () => {
    const created: FrameworkObjective = {
      id: 40,
      portfolioId: 2,
      year: 2026,
      code: 'IOB-29',
      statement: 'X',
      elements: [],
      deletable: true,
      blockers: []
    };
    create();
    await settle();
    button('add-objective').click();
    await settle();
    await typeInto('#objectiveStatement', 'X');
    let resolvePost: (value: MainResponse<FrameworkObjective>) => void = () => undefined;
    api.POST_StrategyFrameworkObjective.mockReturnValue(new Promise(resolve => (resolvePost = resolve)));
    (document.querySelector('[data-testid="objective-save"] button') as HTMLButtonElement).click();
    await typeInto('#objectiveStatement', 'XY');
    api.GET_StrategyFrameworkObjectives.mockResolvedValue(ok([...OBJECTIVES, created]));
    resolvePost(ok(created));
    await settle();

    expect(statement()).toBe('XY');
    expect(document.querySelector('[data-testid="objective-panel-delete"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="panel-title"]')?.textContent?.trim()).not.toContain('New');
    expect(row(40).getAttribute('aria-selected')).toBe('true');
  });

  it('does not ask to discard a saved edit before the refresh returns', async () => {
    create();
    await settle();
    await clickRow(10);
    await typeInto('#objectiveStatement', 'Raise incomes updated');
    let resolvePatch: (value: MainResponse<FrameworkObjective>) => void = () => undefined;
    let resolveGet: (value: MainResponse<FrameworkObjective[]>) => void = () => undefined;
    api.PATCH_StrategyFrameworkObjective.mockReturnValue(new Promise(resolve => (resolvePatch = resolve)));
    (document.querySelector('[data-testid="objective-save"] button') as HTMLButtonElement).click();
    api.GET_StrategyFrameworkObjectives.mockReturnValue(new Promise(resolve => (resolveGet = resolve)));
    resolvePatch(ok({ ...OBJECTIVES[0], statement: 'Raise incomes updated' }));
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
    actions.showGlobalAlert.mockClear();

    row(11).click();
    fixture.detectChanges();

    expect(actions.showGlobalAlert).not.toHaveBeenCalled();
    expect(statement()).toBe('Cut loss');
    resolveGet(ok(OBJECTIVES));
    await settle();
  });

  it('keeps the portfolio and year selects when the next portfolio load fails', async () => {
    create();
    await settle();
    const portfolio = q('portfolio-select');
    const year = q('year-select');
    expect(portfolio).not.toBeNull();
    expect(year).not.toBeNull();

    api.GET_StrategyFrameworkObjectiveYears.mockImplementation((id: number) =>
      id === 1 ? Promise.resolve(failed(500, 'The objectives read failed')) : Promise.resolve(ok({ years: YEAR_ROWS, defaultYear }))
    );
    await pickOption('portfolio-select', option => option.id === 1);

    expect(q('error-state')?.textContent).toContain('The objectives read failed');
    expect(q('retry-button')).not.toBeNull();
    expect(q('portfolio-select')).toBe(portfolio);
    expect(q('year-select')).toBe(year);
    expect(q('objectives-list')?.contains(portfolio)).toBe(true);
    expect(q('objectives-list')?.contains(year)).toBe(true);
  });

  it('asks before a year change, and Keep editing leaves the year label and the form', async () => {
    create();
    await settle();
    await clickRow(10);
    await typeInto('#objectiveStatement', 'edited text');
    const yearSelect = fixture.debugElement.query(By.css('[data-testid="year-select"]')).componentInstance as Select;
    const rejected = (yearSelect.options as { year: number }[]).find(option => option.year === 2027);
    yearSelect.onOptionSelect(new Event('click'), rejected);
    await settle();

    expect(lastAlert().summary).toBe('Discard changes?');
    expect(lastAlert().detail).toBe('Your edits to IOB-1 will be lost.');
    expect(lastAlert().cancelCallback?.label).toBe('Keep editing');
    await answer('Keep editing');

    expect(component.year()).toBe(2026);
    expect(q('year-select')?.querySelector('.p-select-label')?.textContent).toContain('2026 · 28 objectives');
    expect(q('year-select')?.querySelector('.p-select-label')?.textContent).not.toContain('2027');
    expect(statement()).toBe('edited text');
    expect(row(10).getAttribute('aria-selected')).toBe('true');
  });

  it('shows the current portfolio label again when Keep editing rejects the change', async () => {
    create();
    await settle();
    await clickRow(10);
    await typeInto('#objectiveStatement', 'portfolio edit');
    const select = fixture.debugElement.query(By.css('[data-testid="portfolio-select"]')).componentInstance as Select;
    const rejected = (select.options as { id: number }[]).find(option => option.id === 1);
    select.onOptionSelect(new Event('click'), rejected);
    await settle();
    await answer('Keep editing');

    expect(component.portfolioId()).toBe(2);
    expect(q('portfolio-select')?.querySelector('.p-select-label')?.textContent).toContain('Portfolio 2');
    expect(q('portfolio-select')?.querySelector('.p-select-label')?.textContent).not.toContain('Portfolio 1');
    expect(statement()).toBe('portfolio edit');
  });

  it('shows the new year label when a clean year change proceeds, and clears the selection', async () => {
    create();
    await settle();
    await clickRow(10);

    await pickOption('year-select', option => option.year === 2027);

    expect(actions.showGlobalAlert).not.toHaveBeenCalled();
    expect(component.year()).toBe(2027);
    expect(selectLabel('year-select')).toContain('2027 · 0 objectives');
    expect(selectLabel('year-select')).not.toContain('2026');
    expect(component.selectedId()).toBeNull();
    expect(q('panel-empty')?.textContent).toContain('Explore the institutional objectives');
    expect(q('panel-empty')?.textContent).toContain('0 Objectives · 2027');
    expect(q('panel-empty')?.textContent).toContain('Carry forward to 2028');
  });

  it('shows the new year label when Discard proceeds, and clears the selection', async () => {
    create();
    await settle();
    await clickRow(10);
    await typeInto('#objectiveStatement', 'edited text');

    await pickOption('year-select', option => option.year === 2027);
    expect(lastAlert().summary).toBe('Discard changes?');
    await answer('Discard');

    expect(component.year()).toBe(2027);
    expect(selectLabel('year-select')).toContain('2027 · 0 objectives');
    expect(selectLabel('year-select')).not.toContain('2026');
    expect(component.selectedId()).toBeNull();
    expect(q('panel-empty')?.textContent).toContain('Explore the institutional objectives');
    expect(q('panel-empty')?.textContent).toContain('0 Objectives · 2027');
    expect(q('panel-empty')?.textContent).toContain('Carry forward to 2028');
  });

  it('shows the new portfolio label when a clean portfolio change proceeds, and clears the selection', async () => {
    create();
    await settle();
    await clickRow(10);

    await pickOption('portfolio-select', option => option.id === 1);

    expect(actions.showGlobalAlert).not.toHaveBeenCalled();
    expect(component.portfolioId()).toBe(1);
    expect(selectLabel('portfolio-select')).toContain('Portfolio 1');
    expect(selectLabel('portfolio-select')).not.toContain('Portfolio 2');
    expect(component.selectedId()).toBeNull();
    expect(q('panel-empty')?.textContent).toContain('Explore the institutional objectives');
    expect(q('panel-empty')?.textContent).toContain('28 Objectives · 2026');
  });

  it('shows the new portfolio label when Discard proceeds, and clears the selection', async () => {
    create();
    await settle();
    await clickRow(10);
    await typeInto('#objectiveStatement', 'edited text');

    await pickOption('portfolio-select', option => option.id === 1);
    expect(lastAlert().summary).toBe('Discard changes?');
    await answer('Discard');

    expect(component.portfolioId()).toBe(1);
    expect(selectLabel('portfolio-select')).toContain('Portfolio 1');
    expect(selectLabel('portfolio-select')).not.toContain('Portfolio 2');
    expect(component.selectedId()).toBeNull();
    expect(q('panel-empty')?.textContent).toContain('Explore the institutional objectives');
    expect(q('panel-empty')?.textContent).toContain('28 Objectives · 2026');
  });

  it('asks before carry forward while the form is dirty, and Keep editing does not copy', async () => {
    create();
    await settle();
    await clickRow(10);
    await typeInto('#objectiveStatement', 'edited text');

    button('carry-forward').click();
    await settle();
    expect(lastAlert().summary).toBe('Discard changes?');
    expect(lastAlert().detail).toBe('Your edits to IOB-1 will be lost.');
    await answer('Keep editing');

    expect(api.POST_StrategyFrameworkCarryForward).not.toHaveBeenCalled();
    expect(statement()).toBe('edited text');
    expect(component.year()).toBe(2026);

    button('carry-forward').click();
    await settle();
    expect(lastAlert().summary).toBe('Discard changes?');
    await answer('Discard');
    expect(lastAlert().summary).toBe('Carry forward');
    expect(lastAlert().detail).toContain('Copy 28 objectives from 2026 to 2027?');
  });

  it('asks before create, and Discard opens the new objective', async () => {
    create();
    await settle();
    await clickRow(10);
    await typeInto('#objectiveStatement', 'edited text');

    button('add-objective').click();
    await settle();
    expect(lastAlert().detail).toBe('Your edits to IOB-1 will be lost.');
    await answer('Keep editing');
    expect(statement()).toBe('edited text');
    expect(document.querySelector('[data-testid="panel-title"]')?.textContent?.trim()).toBe('IOB-1 · 2026');

    await answer('Discard');
    expect(document.querySelector('[data-testid="panel-title"]')?.textContent?.trim()).toBe('New institutional objective');
    expect((document.querySelector('#objectiveCode') as HTMLInputElement).value).toBe('IOB-29');
  });

  it('deletes from the panel with the same confirm, and focuses the next row', async () => {
    create();
    await settle();
    await clickRow(11);

    const blocked = document.querySelector('[data-testid="objective-panel-delete"] button') as HTMLButtonElement;
    expect(blocked.getAttribute('aria-disabled')).toBe('true');
    expect(document.querySelector('[data-testid="objective-delete-reason"]')?.textContent?.trim()).toBe('Remove its 1 record in KPIs first.');
    blocked.click();
    await settle();
    expect(api.DELETE_StrategyFrameworkObjective).not.toHaveBeenCalled();
    expect(lastAlert().summary).toBe('Cannot delete');
    expect(lastAlert().confirmCallback?.label).toBe('Close');
    expect(lastAlert().hasNoCancelButton).toBe(true);
    expect(lastAlert().detail).toContain('Remove its 1 record in KPIs first.');

    (document.querySelector('[data-testid="objective-cancel"] button') as HTMLButtonElement).click();
    await settle();
    await clickRow(10);
    api.GET_StrategyFrameworkObjectives.mockResolvedValue(ok([OBJECTIVES[1]]));
    const table = root().querySelector('table');
    fixture.autoDetectChanges(true);
    (document.querySelector('[data-testid="objective-panel-delete"] button') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(lastAlert().detail).toBe('Delete Institutional objective IOB-1?');
    expect(lastAlert().confirmCallback?.label).toBe('Delete');
    expect(lastAlert().hideCloseButton).toBe(true);
    await TestBed.inject(NgZone).run(() => lastAlert().confirmCallback?.event?.());
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(api.DELETE_StrategyFrameworkObjective).toHaveBeenCalledTimes(1);
    expect(api.DELETE_StrategyFrameworkObjective).toHaveBeenCalledWith(10);
    expect(actions.showToast).not.toHaveBeenCalled();
    expect(root().querySelector('[data-row-key="10"]')).toBeNull();
    expect(document.activeElement?.getAttribute('data-row-key')).toBe('11');
    expect(root().querySelector('table')).toBe(table);
    expect(root().querySelector('app-custom-progress-bar')).toBeNull();
  });

  it('shows a delete 409 inline and does not toast', async () => {
    api.DELETE_StrategyFrameworkObjective.mockResolvedValue(failed(409, { description: 'Cannot delete IOB-1: linked by 1 record.' }));
    create();
    await settle();
    await clickRow(10);

    (document.querySelector('[data-testid="objective-panel-delete"] button') as HTMLButtonElement).click();
    await settle();
    await lastAlert().confirmCallback?.event?.();
    await settle();

    expect(q('delete-error')?.textContent?.trim()).toBe('Cannot delete IOB-1: linked by 1 record.');
    expect(actions.showToast).not.toHaveBeenCalled();
    expect(actions.handleBadRequest).not.toHaveBeenCalled();
    expect(statement()).toBe('Raise incomes');
  });

  it('keeps a failed save in the panel', async () => {
    api.PATCH_StrategyFrameworkObjective.mockResolvedValue(failed(409, { description: 'code is taken', field: 'code' }));
    create();
    await settle();
    await clickRow(10);
    await typeInto('#objectiveStatement', 'Raise incomes edited');
    (document.querySelector('[data-testid="objective-save"] button') as HTMLButtonElement).click();
    await settle();

    expect(statement()).toBe('Raise incomes edited');
    expect(document.querySelector('[data-testid="objective-error"]')?.textContent?.trim()).toBe('code is taken');
    expect(actions.showToast).not.toHaveBeenCalled();
    expect(row(10).getAttribute('aria-selected')).toBe('true');
  });

  it('leaves the form open when Escape is pressed in a field', async () => {
    create();
    await settle();
    await clickRow(10);
    await typeInto('#objectiveStatement', 'Unsaved statement');

    const code = document.querySelector('#objectiveCode') as HTMLElement;
    code.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
    await settle();

    expect(document.querySelector('[data-testid="objective-form"]')).not.toBeNull();
    expect(statement()).toBe('Unsaved statement');
    expect(actions.showGlobalAlert).not.toHaveBeenCalled();
  });

  it('puts the five header controls in order and shows the year count line', async () => {
    create();
    await settle();

    const header = q('page-header');
    const actions = q('header-actions');
    expect(header?.contains(q('page-subtitle'))).toBe(true);
    expect(q('page-subtitle')?.textContent?.trim()).toBe("Define each year's institutional objectives and link them to framework indicators.");
    const order = ['carry-forward', 'add-objective', 'export-button'].map(id => actions?.querySelector(`[data-testid="${id}"]`));
    expect(order.every(element => element !== null)).toBe(true);
    for (let index = 1; index < order.length; index += 1) {
      expect(order[index - 1]!.compareDocumentPosition(order[index]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(header?.querySelector('[data-testid="portfolio-select"]')).toBeNull();
    expect(header?.querySelector('[data-testid="year-select"]')).toBeNull();
    expect(q('objectives-list')?.querySelectorAll('[data-testid="portfolio-select"]')).toHaveLength(1);
    expect(q('objectives-list')?.querySelectorAll('[data-testid="year-select"]')).toHaveLength(1);
    expect(q('objectives-search')!.compareDocumentPosition(q('portfolio-select')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(q('portfolio-select')!.compareDocumentPosition(q('year-select')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(chipTexts()).toEqual(['Objectives · 28', 'Linked indicator · 1']);
    expect(q('count-chips')?.tagName).toBe('UL');
    expect(q('count-chips')?.getAttribute('aria-label')).toBe('Counts');
    expect(q('count-chip')?.tagName).toBe('LI');
    expect(q('count-chip')?.classList.contains('level-chip')).toBe(true);
    expect(q('summary-line')).toBeNull();
    expect(q('objectives-list')?.contains(q('count-chips'))).toBe(true);
    expect(q('list-band')?.firstElementChild).toBe(q('count-chips'));
    expect(q('list-scroll')?.firstElementChild?.getAttribute('data-testid')).toBe('list-band');
    expect(q('count-chips')!.compareDocumentPosition(q('objectives-search')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(root().querySelector('label[for="objectivePortfolio"]')?.classList.contains('label')).toBe(true);
    expect(root().querySelector('label[for="objectivePageYear"]')?.classList.contains('label')).toBe(true);
  });

  it('uses the singular for one objective and one linked indicator', async () => {
    create();
    await settle();
    expect(chipTexts()).toEqual(['Objectives · 28', 'Linked indicator · 1']);

    await pickOption('year-select', option => option.year === 2028);
    expect(chipTexts()).toEqual(['Objective · 1', 'Linked indicators · 0']);
  });

  it('filters the list by code and by statement and keeps a hidden selection', async () => {
    create();
    await settle();
    await clickRow(10);

    const codes = () => Array.from(root().querySelectorAll('[data-testid="cell-code"]')).map(cell => cell.textContent?.trim());
    const search = q('objectives-search') as HTMLInputElement;
    const findLabel = root().querySelector('label[for="objectives-search"]');
    expect(findLabel?.classList.contains('label')).toBe(true);
    expect(findLabel?.textContent?.trim()).toBe('Find by code or statement');
    expect((q('objectives-search') as HTMLInputElement).classList.contains('p-inputtext')).toBe(true);
    expect((q('objectives-search') as HTMLInputElement).getAttribute('placeholder')).toBe('Find by code or statement');
    search.value = 'IOB-2';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();

    expect(codes()).toEqual(['IOB-2']);
    expect(component.selectedId()).toBe(10);
    expect(q('objectives-table')?.textContent).not.toContain('Raise incomes');
    expect(row(10)).toBeNull();
    expect(q('data-table-search')).toBeNull();
    expect(q('data-table-export')).toBeNull();

    search.value = 'Raise';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
    expect(codes()).toEqual(['IOB-1']);
    expect(q('objectives-table')?.textContent).toContain('Raise incomes');
    expect(q('objectives-table')?.textContent).not.toContain('Cut loss');
    expect(row(10).getAttribute('aria-selected')).toBe('true');
  });

  it('says nothing matches instead of the true-empty message, then restores the rows', async () => {
    create();
    await settle();
    await clickRow(10);
    const search = q('objectives-search') as HTMLInputElement;

    search.value = 'zzz';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();

    expect(q('objectives-search-empty')?.textContent?.trim()).toBe('No objectives match "zzz"');
    expect(q('objectives-search-empty')?.getAttribute('role')).toBe('status');
    expect(q('data-table-empty')).toBeNull();
    expect(root().textContent).not.toContain('No institutional objectives for this year yet.');
    expect(component.selectedId()).toBe(10);

    (q('objectives-search-clear') as HTMLButtonElement).click();
    await settle();

    const codes = () => Array.from(root().querySelectorAll('[data-testid="cell-code"]')).map(cell => cell.textContent?.trim());
    expect(codes()).toEqual(['IOB-1', 'IOB-2']);
    expect(q('objectives-search-empty')).toBeNull();
    expect(row(10).getAttribute('aria-selected')).toBe('true');
  });

  it('keeps the find term, the clear button and the no-match line after a clean year change', async () => {
    api.GET_StrategyFrameworkObjectives.mockImplementation((_portfolioId: number, year: number) =>
      Promise.resolve(ok(year === 2026 || year === 2028 ? OBJECTIVES : []))
    );
    create();
    await settle();

    const search = q('objectives-search') as HTMLInputElement;
    search.value = 'zzz';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();

    let resolveYear: (value: ReturnType<typeof ok<FrameworkObjective[]>>) => void = () => undefined;
    api.GET_StrategyFrameworkObjectives.mockReturnValue(new Promise(resolve => (resolveYear = resolve)));
    fixture.debugElement.query(By.css('[data-testid="year-select"]')).triggerEventHandler('onChange', { value: 2028 });
    fixture.detectChanges();
    expect(q('objectives-search')).toBe(search);
    expect(q('year-select')).not.toBeNull();
    expect(q('portfolio-select')).not.toBeNull();

    resolveYear(ok(OBJECTIVES));
    await settle();

    const kept = q('objectives-search') as HTMLInputElement;
    expect(kept).toBe(search);
    expect(component.year()).toBe(2028);
    expect(actions.showGlobalAlert).not.toHaveBeenCalled();
    expect(kept.value).toBe('zzz');
    expect(q('objectives-search-clear')).not.toBeNull();
    expect(q('objectives-search-empty')?.textContent?.trim()).toBe('No objectives match "zzz"');

    (q('objectives-search-clear') as HTMLButtonElement).click();
    await settle();

    const codes = () => Array.from(root().querySelectorAll('[data-testid="cell-code"]')).map(cell => cell.textContent?.trim());
    expect(codes()).toEqual(['IOB-1', 'IOB-2']);
    expect(q('objectives-search-empty')).toBeNull();
    expect((q('objectives-search') as HTMLInputElement).value).toBe('');
  });

  it('exports every objective of the year, code-sorted, while the find field hides rows', async () => {
    const tenth: FrameworkObjective = {
      id: 12,
      portfolioId: 2,
      year: 2026,
      code: 'IOB-10',
      statement: 'Tenth objective',
      elements: [{ id: 32, code: '1.1.2', name: 'Loss' }],
      deletable: true,
      blockers: []
    };
    const shuffled = [tenth, OBJECTIVES[1], OBJECTIVES[0]];
    api.GET_StrategyFrameworkObjectives.mockImplementation((_portfolioId: number, year: number) =>
      Promise.resolve(ok(year === 2026 ? shuffled : []))
    );
    const exportSpy = jest.spyOn(xlsxExportUtil, 'exportRowsToXlsx').mockResolvedValue(undefined);
    create();
    await settle();

    const search = q('objectives-search') as HTMLInputElement;
    search.value = 'Tenth';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
    expect(root().textContent).toContain('Tenth objective');
    expect(root().textContent).not.toContain('Raise incomes');

    button('export-button').click();
    await settle();

    expect(exportSpy).toHaveBeenCalledTimes(1);
    const payload = exportSpy.mock.calls[0][0] as {
      columns: { field: string; header: string }[];
      rows: { code: string; statement: string }[];
      fileName: string;
    };
    expect(payload.fileName).toBe('institutional-objectives_2026.xlsx');
    expect(payload.columns.map(column => column.header)).toEqual(['Code', 'Statement', 'Linked indicators']);
    expect(payload.columns.map(column => column.field)).toEqual(['code', 'statement', 'linkedIndicatorsText']);
    expect(payload.rows.map(item => item.code)).toEqual(['IOB-1', 'IOB-2', 'IOB-10']);
    expect(payload.rows.map(item => item.statement)).toEqual(['Raise incomes', 'Cut loss', 'Tenth objective']);
  });

  it('puts each linked indicator on its own line', () => {
    expect(
      linkedIndicatorsText([
        { code: '1.1.1', name: 'Process efficiency' },
        { code: '1.1.2', name: 'Loss' }
      ])
    ).toBe('1.1.1 Process efficiency\n1.1.2 Loss');
  });
});
