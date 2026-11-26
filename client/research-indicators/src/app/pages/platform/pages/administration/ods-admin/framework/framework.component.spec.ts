import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { Select } from 'primeng/select';
import { FrameworkContext, FrameworkEditorElement, FrameworkEditorView, FrameworkLevel } from '@shared/interfaces/strategy-framework.interface';
import { GlobalAlert } from '@shared/interfaces/global-alert.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import { CacheService } from '@shared/services/cache/cache.service';
import * as xlsxExportUtil from '@shared/utils/xlsx-export.util';
import { ElementPanelComponent } from './components/element-panel/element-panel.component';
import FrameworkComponent from './framework.component';

// @akili-spec institutional-performance/strategy-framework T-19 — R-STF-007, R-STF-008, R-STF-016, NFR-STF-004.
// KZ-015: row clicks, chips, buttons and the alert callbacks drive the transition.
// KZ-001: the panel header, the request body and the toast are asserted from the DOM and the mock.
// KZ-017: jsdom cannot judge viewport fit, scroll, or real Tab order. The column height binding is not that measurement.

const ok = <T>(data: T): MainResponse<T> =>
  ({ data, status: 200, description: 'ok', timestamp: '', path: '', successfulRequest: true }) as MainResponse<T>;

const failed = (status: number, errorDetail: unknown): MainResponse<FrameworkEditorView> =>
  ({
    data: undefined,
    status,
    description: 'error',
    timestamp: '',
    path: '',
    successfulRequest: false,
    errorDetail
  }) as unknown as MainResponse<FrameworkEditorView>;

const LEVELS: FrameworkLevel[] = [
  { depth: 1, name: 'Performance Area', pluralName: 'Performance Areas', shortLabel: 'AREA', isIndicatorLevel: false, virtual: true },
  { depth: 2, name: 'Dimension', pluralName: 'Dimensions', shortLabel: 'DIMENSION', isIndicatorLevel: false, virtual: true },
  { depth: 3, name: 'Indicator', pluralName: 'Indicators', shortLabel: 'INDICATOR', isIndicatorLevel: true, virtual: true }
];

const storedLevels = LEVELS.map(level => ({
  id: level.depth,
  depth: level.depth,
  name: level.name,
  pluralName: level.pluralName,
  shortLabel: level.shortLabel,
  isIndicatorLevel: level.isIndicatorLevel
}));

const element = (
  partial: Partial<FrameworkEditorElement> & Pick<FrameworkEditorElement, 'id' | 'depth' | 'code' | 'name'>
): FrameworkEditorElement => ({
  levelId: partial.depth,
  description: null,
  parentId: null,
  descendantCounts: {},
  usage: {},
  deletable: true,
  blockers: [],
  ...partial
});

const CONTEXT: FrameworkContext = {
  currentYear: 2026,
  defaultPortfolioId: 2,
  portfolios: [
    { id: 1, name: 'Portfolio 1', startYear: 2020, endYear: 2021, configured: false },
    { id: 2, name: 'Portfolio 2', startYear: 2026, endYear: 2030, configured: true }
  ]
};

const WITH_ELEMENTS: FrameworkEditorView = {
  portfolioId: 2,
  configured: true,
  levels: storedLevels,
  usageLabels: [],
  elements: [element({ id: 1, depth: 1, code: '1', name: 'Area' })]
};

const EMPTY: FrameworkEditorView = {
  portfolioId: 1,
  configured: false,
  levels: LEVELS,
  elements: [],
  usageLabels: []
};

const FOUR_LEVELS: FrameworkLevel[] = [
  { id: 4, depth: 4, name: 'Sub-indicator', pluralName: 'Sub-indicators', shortLabel: 'SUB', isIndicatorLevel: false },
  { id: 1, depth: 1, name: 'Performance Area', pluralName: 'Performance Areas', shortLabel: 'AREA', isIndicatorLevel: false },
  { id: 3, depth: 3, name: 'Indicator', pluralName: 'Indicators', shortLabel: 'INDICATOR', isIndicatorLevel: true },
  { id: 2, depth: 2, name: 'Dimension', pluralName: 'Dimensions', shortLabel: 'DIMENSION', isIndicatorLevel: false }
];

const FOUR_LEVEL_VIEW: FrameworkEditorView = {
  portfolioId: 2,
  configured: true,
  levels: FOUR_LEVELS,
  usageLabels: [],
  elements: [
    element({ id: 1, depth: 1, code: '1', name: 'Area A' }),
    element({ id: 2, depth: 1, code: '2', name: 'Area B' }),
    element({ id: 3, depth: 1, code: '3', name: 'Area C' }),
    element({ id: 4, depth: 1, code: '4', name: 'Area D' }),
    element({ id: 5, depth: 2, code: '1.1', name: 'Dimension one', parentId: 1 }),
    element({ id: 6, depth: 2, code: '1.2', name: 'Dimension two', parentId: 1 }),
    element({ id: 7, depth: 3, code: '1.1.1', name: 'Process efficiency', parentId: 5 }),
    element({ id: 8, depth: 4, code: '1.1.1.1', name: 'Sub', parentId: 7 })
  ]
};

const SEEDED: FrameworkEditorView = {
  portfolioId: 2,
  configured: true,
  levels: storedLevels,
  usageLabels: [],
  elements: [
    element({ id: 1, depth: 1, code: '1', name: 'Area' }),
    element({ id: 20, depth: 2, code: '1.1', name: 'Dimension one', parentId: 1 }),
    element({ id: 21, depth: 2, code: '1.2', name: 'Dimension two', parentId: 1 }),
    element({ id: 31, depth: 3, code: '1.1.1', name: 'Process efficiency', parentId: 20, description: 'Stored text' }),
    element({ id: 32, depth: 3, code: '1.1.2', name: 'Quality', parentId: 20 })
  ]
};

describe('FrameworkComponent', () => {
  let fixture: ComponentFixture<FrameworkComponent>;
  let component: FrameworkComponent;
  let query: Record<string, string>;
  let api: {
    GET_StrategyFrameworkContext: jest.Mock;
    GET_StrategyFrameworkEditor: jest.Mock;
    GET_StrategyFrameworkCodeProposal: jest.Mock;
    GET_StrategyFrameworkStaff: jest.Mock;
    POST_StrategyFrameworkElement: jest.Mock;
    PATCH_StrategyFrameworkElement: jest.Mock;
    DELETE_StrategyFrameworkElement: jest.Mock;
    GET_StrategyFrameworkElementBlockers: jest.Mock;
  };
  let actions: { handleBadRequest: jest.Mock; showGlobalAlert: jest.Mock; showToast: jest.Mock };
  let router: { navigate: jest.Mock };

  const root = () => fixture.nativeElement as HTMLElement;
  const q = (testId: string) => root().querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();
  };
  const create = () => {
    fixture = TestBed.createComponent(FrameworkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };
  const treeRow = (code: string) =>
    Array.from(root().querySelectorAll('[data-testid="framework-tree-row"]')).find(
      row => row.querySelector('[data-testid="framework-tree-code"]')?.textContent?.trim() === code
    ) as HTMLElement;
  const clickTree = async (code: string) => {
    (treeRow(code).querySelector('[data-testid="framework-tree-name"]') as HTMLElement).click();
    await settle();
  };
  const typeInto = async (selector: string, value: string) => {
    const field = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const lastAlert = () => actions.showGlobalAlert.mock.calls.at(-1)?.[0] as GlobalAlert;
  const answer = async (label: 'Discard' | 'Keep editing') => {
    const alert = lastAlert();
    const callback = label === 'Discard' ? alert.confirmCallback : alert.cancelCallback;
    callback?.event?.();
    await settle();
  };
  const portfolioLabel = () => root().querySelector('[data-testid="portfolio-select"] .p-select-label')?.textContent ?? '';
  const pickPortfolio = async (id: number) => {
    const select = fixture.debugElement.query(By.css('[data-testid="portfolio-select"]')).componentInstance as Select;
    const option = (select.options as { id: number }[]).find(item => item.id === id);
    select.onOptionSelect(new Event('click'), option);
    await settle();
  };

  beforeEach(async () => {
    query = {};
    const params = { get: (name: string) => query[name] ?? null };
    api = {
      GET_StrategyFrameworkContext: jest.fn().mockResolvedValue(ok(CONTEXT)),
      GET_StrategyFrameworkEditor: jest.fn().mockImplementation((id: number) => Promise.resolve(ok(id === 1 ? EMPTY : WITH_ELEMENTS))),
      GET_StrategyFrameworkCodeProposal: jest.fn().mockResolvedValue(ok({ code: '2' })),
      GET_StrategyFrameworkStaff: jest.fn().mockResolvedValue(ok([])),
      POST_StrategyFrameworkElement: jest.fn(),
      PATCH_StrategyFrameworkElement: jest.fn(),
      DELETE_StrategyFrameworkElement: jest.fn().mockResolvedValue(ok({ id: 31 })),
      GET_StrategyFrameworkElementBlockers: jest.fn().mockResolvedValue(ok({ children: 0, objectives: 0, consumers: [], wayOut: [] }))
    };
    actions = { handleBadRequest: jest.fn(), showGlobalAlert: jest.fn(), showToast: jest.fn() };
    router = { navigate: jest.fn().mockResolvedValue(true) };
    await TestBed.configureTestingModule({
      imports: [FrameworkComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ApiService, useValue: api },
        { provide: ActionsService, useValue: actions },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: params }, queryParamMap: of(params) } }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fixture?.destroy();
  });

  it('shows a skeleton, then the title from the years of Portfolio 2', async () => {
    let resolveContext: (value: MainResponse<FrameworkContext>) => void = () => undefined;
    api.GET_StrategyFrameworkContext.mockReturnValue(new Promise(resolve => (resolveContext = resolve)));
    create();

    expect(root().querySelector('app-custom-progress-bar')).not.toBeNull();
    expect(q('page-title')?.textContent?.trim()).toBe('Monitoring framework');
    expect(q('empty-state')).toBeNull();

    resolveContext(ok(CONTEXT));
    await settle();

    expect(q('page-title')?.textContent?.trim()).toBe('Strategy 2026–2030 – Monitoring framework');
    expect(q('page-title')?.textContent).not.toContain('Portfolio 2 –');
    expect(q('eyebrow')?.textContent?.trim()).toBe('ADMIN · ODS');
    expect(q('summary-line')?.textContent?.trim()).toBe('1 performance area · 0 dimensions · 0 indicators');
    expect(q('view-tree')?.textContent?.trim()).toBe('Tree');
    expect(root().querySelector('p-treetable input, p-treetable textarea')).toBeNull();
    expect(treeRow('1').querySelector('[data-testid="framework-tree-name"]')?.textContent?.trim()).toBe('Area');
    expect(q('framework-banner')?.textContent).toContain('Changes apply to every module that uses the framework. Items in use cannot be deleted.');
    expect(root().querySelector('app-custom-progress-bar')).toBeNull();
    expect(root().querySelector('p-' + 'drawer')).toBeNull();
  });

  it('binds the column height from the navbar and header signals', async () => {
    const cache = TestBed.inject(CacheService);
    cache.navbarHeight.set(51);
    cache.headerHeight.set(60.5);
    create();
    await settle();

    expect(q('framework-page')?.style.getPropertyValue('--framework-column-height').trim()).toBe('calc(100vh - 111.5px)');
    expect(q('framework-page')?.classList.contains('pt-3')).toBe(false);
  });

  const emptyRows = () => Array.from(root().querySelectorAll('[data-testid="empty-level-row"]')) as HTMLElement[];

  it('shows one empty-panel row per level, then hides them when a row is selected', async () => {
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok(FOUR_LEVEL_VIEW));
    create();
    await settle();

    expect(q('panel-empty')?.textContent).toContain('Explore the performance framework');
    expect(q('panel-empty')?.textContent).toContain('Select an item from the hierarchy to see its details and actions.');
    expect(emptyRows()).toHaveLength(4);
    expect(emptyRows().map(row => row.getAttribute('data-depth'))).toEqual(['1', '2', '3', '4']);
    const rowText = emptyRows().map(row => row.textContent ?? '');
    expect(rowText[0]).toContain('4 Performance Areas');
    expect(rowText[0]).toContain('Strategic performance areas of the portfolio.');
    expect(rowText[1]).toContain('2 Dimensions');
    expect(rowText[1]).toContain('Dimensions within each area.');
    expect(rowText[2]).toContain('1 Indicators');
    expect(rowText[2]).toContain('Indicators, their details and responsibles.');
    expect(rowText[3]).toContain('1 Sub-indicators');
    expect(rowText[3]).toContain('Elements at this level.');
    expect(q('panel-empty')?.querySelector('button')).toBeNull();
    for (const row of emptyRows()) {
      expect(row.tagName).toBe('LI');
      expect(row.hasAttribute('tabindex')).toBe(false);
      expect(row.querySelector('button, [tabindex]')).toBeNull();
    }
    q('panel-empty')?.querySelectorAll('i').forEach(icon => expect(icon.getAttribute('aria-hidden')).toBe('true'));

    await clickTree('1');
    expect(q('panel-empty')).toBeNull();
    expect(emptyRows()).toHaveLength(0);
    expect(document.querySelector('[data-testid="panel-code"]')?.textContent?.trim()).toBe('1');
  });

  it('hides the empty panel when a create starts', async () => {
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok(FOUR_LEVEL_VIEW));
    create();
    await settle();

    expect(emptyRows()).toHaveLength(4);
    (q('new-element')?.querySelector('button') as HTMLButtonElement).click();
    await settle();

    expect(q('panel-empty')).toBeNull();
    expect(emptyRows()).toHaveLength(0);
    expect(document.querySelector('[data-testid="panel-title"]')?.textContent?.trim()).toBe('New Performance Area');
  });

  it('labels an unconfigured portfolio and opens create beside the empty list', async () => {
    create();
    await settle();

    const unconfigured = component.portfolioOptions().find(portfolio => portfolio.id === 1);
    expect(unconfigured?.label).toBe('Portfolio 1 · 2020–2021 (not configured)');
    fixture.debugElement.query(By.directive(Select)).triggerEventHandler('onChange', { value: 1 });
    await settle();

    expect(q('empty-state')?.textContent).toContain('This portfolio has no framework yet');
    expect(q('add-root-button')?.textContent).toContain('+ Add Performance Area');
    expect(q('panel-empty')?.textContent).toContain('Explore the performance framework');
    expect(q('side-panel')?.getAttribute('aria-label')).toBe('Element details');

    (q('add-root-button')?.querySelector('button') as HTMLButtonElement).click();
    await settle();
    expect(q('empty-state')).not.toBeNull();
    expect(q('panel-empty')).toBeNull();
    expect(document.querySelector('[data-testid="panel-title"]')?.textContent?.trim()).toBe('New Performance Area');
    expect(root().querySelector('p-' + 'drawer')).toBeNull();
  });

  it.each([403, 404])('shows the error state with Retry when the editor load returns %s', async status => {
    const detail =
      status === 403
        ? { description: 'ForbiddenException', status, errors: 'Forbidden' }
        : { description: 'NotFoundException', status, errors: { description: 'Portfolio not found', field: 'portfolioId' } };
    api.GET_StrategyFrameworkEditor.mockResolvedValue(failed(status, detail));
    create();
    await settle();

    expect(q('error-state')).not.toBeNull();
    expect(q('retry-button')?.textContent).toContain('Retry');
    expect(root().textContent).toContain(status === 403 ? 'Forbidden' : 'Portfolio not found');
    expect(q('empty-state')).toBeNull();
    expect(q('framework-tree-slot')).toBeNull();
    expect(q('side-panel')).toBeNull();
  });

  it('shows the framework error inline and raises no result-title alert', async () => {
    api.GET_StrategyFrameworkEditor.mockResolvedValue(
      failed(409, {
        description: 'ConflictException',
        status: 409,
        errors: { description: 'code is taken: STAR-1', field: 'code', result_official_code: 1234 }
      })
    );
    create();
    await settle();

    expect(q('error-state')?.textContent).toContain('code is taken: STAR-1');
    expect(actions.handleBadRequest).not.toHaveBeenCalled();
    expect(actions.showGlobalAlert).not.toHaveBeenCalled();
  });

  it('retries a failed load into the tree', async () => {
    api.GET_StrategyFrameworkEditor.mockResolvedValueOnce(failed(500, 'The framework read failed')).mockResolvedValue(ok(WITH_ELEMENTS));
    create();
    await settle();
    expect(q('error-state')?.textContent).toContain('The framework read failed');

    (q('retry-button')?.querySelector('button') as HTMLButtonElement).click();
    await settle();

    expect(q('error-state')).toBeNull();
    expect(q('framework-tree-slot')).not.toBeNull();
  });

  it('opens Table from an old level param and does not write level', async () => {
    query = { view: 'table', level: 'depth-3' };
    create();
    await settle();
    expect(component.view()).toBe('table');
    expect(q('view-table')?.getAttribute('aria-pressed')).toBe('true');
    expect(q('framework-tables-slot')).not.toBeNull();
    expect(q('framework-tree-slot')).toBeNull();
    expect(root().querySelector('[data-testid="cell-code"]')?.textContent?.trim()).toBe('1');
    expect(root().querySelector('[data-testid="cell-levelName"]')?.textContent?.trim()).toBe('Performance Area');

    (q('view-tree') as HTMLButtonElement).click();
    await settle();
    expect(component.view()).toBe('editor');
    expect(q('framework-tree-slot')).not.toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { view: null, level: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      })
    );
  });

  it('falls back to the tree when the view slug is not in the vocabulary', async () => {
    query = { view: 'cards', level: 'performance-area' };
    create();
    await settle();
    expect(component.view()).toBe('editor');
    expect(q('framework-tree-slot')).not.toBeNull();
  });

  it('draws Export .xlsx as the outlined excel button and keeps it off until a portfolio loads', async () => {
    create();

    const pending = q('export-button')?.querySelector('button') as HTMLButtonElement;
    expect(pending.classList.contains('p-button-outlined')).toBe(true);
    expect(pending.querySelector('.pi-file-excel')).not.toBeNull();
    expect(pending.disabled).toBe(true);

    await settle();

    const ready = q('export-button')?.querySelector('button') as HTMLButtonElement;
    const add = q('new-element')?.querySelector('button') as HTMLButtonElement;
    expect(ready.classList.contains('p-button-outlined')).toBe(true);
    expect(ready.classList.contains('p-button-sm')).toBe(true);
    expect(add.classList.contains('p-button-sm')).toBe(true);
    expect(ready.querySelector('.pi-file-excel')).not.toBeNull();
    expect(ready.disabled).toBe(false);
  });

  it('exports one sheet per level for the selected portfolio', async () => {
    const exportSpy = jest.spyOn(xlsxExportUtil, 'exportSheetsToXlsx').mockResolvedValue(undefined);
    create();
    await settle();

    (q('export-button')?.querySelector('button') as HTMLButtonElement).click();
    await settle();

    expect(exportSpy).toHaveBeenCalledTimes(1);
    const input = exportSpy.mock.calls[0][0];
    expect(input.fileName).toBe('strategy-framework_2026-2030.xlsx');
    expect(input.sheets.map(sheet => sheet.name)).toEqual(['Performance Areas', 'Dimensions', 'Indicators']);
  });

  it('fills the panel from a tree row and from a level-table row, and shows the empty state first', async () => {
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok(SEEDED));
    create();
    await settle();

    expect(q('panel-empty')?.textContent).toContain('Explore the performance framework');
    expect(document.querySelector('[data-testid="element-form"]')).toBeNull();
    expect(document.querySelector('p-' + 'drawer')).toBeNull();

    await clickTree('1.1.1');
    expect(document.querySelector('[data-testid="panel-level"]')?.textContent?.trim()).toBe('INDICATOR · LEVEL 3');
    expect(document.querySelector('[data-testid="panel-code"]')?.textContent?.trim()).toBe('1.1.1');
    const remove = document.querySelector('[data-testid="element-delete"] button') as HTMLButtonElement;
    const code = document.querySelector('#elementCode') as HTMLInputElement;
    expect(code.compareDocumentPosition(remove) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(treeRow('1.1.1').getAttribute('aria-selected')).toBe('true');

    (q('view-table') as HTMLButtonElement).click();
    await settle();
    expect(actions.showGlobalAlert).not.toHaveBeenCalled();
    expect(root().querySelector('[data-row-key="31"]')?.getAttribute('aria-selected')).toBe('true');
    expect(root().querySelector('[data-testid="level-chip"]')?.getAttribute('aria-pressed')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { view: 'table', level: null } }));
    expect(document.querySelector('#elementCode')?.getAttribute('value') ?? (document.querySelector('#elementCode') as HTMLInputElement).value).toBe(
      '1.1.1'
    );

    const other = root().querySelector('[data-testid="data-table-row"][data-row-key="32"]') as HTMLElement;
    other.click();
    await settle();
    expect((document.querySelector('#elementName') as HTMLInputElement).value).toBe('Quality');
    expect(other.getAttribute('aria-selected')).toBe('true');
  });

  it('saves the typed name, toasts, and keeps the row selected', async () => {
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok(SEEDED));
    create();
    await settle();
    await clickTree('1.1.1');
    await typeInto('#elementName', 'Process efficiency updated');
    api.PATCH_StrategyFrameworkElement.mockResolvedValue(ok({ ...SEEDED.elements[3], name: 'Process efficiency updated' }));
    api.GET_StrategyFrameworkEditor.mockResolvedValue(
      ok({
        ...SEEDED,
        elements: SEEDED.elements.map(item => (item.id === 31 ? { ...item, name: 'Process efficiency updated' } : item))
      })
    );

    (document.querySelector('[data-testid="element-save"] button') as HTMLButtonElement).click();
    await settle();

    expect(api.PATCH_StrategyFrameworkElement).toHaveBeenCalledWith(31, {
      code: '1.1.1',
      name: 'Process efficiency updated',
      description: 'Stored text',
      responsibleCarnets: []
    });
    expect(actions.showToast).toHaveBeenCalledWith({ severity: 'success', summary: 'Saved', detail: '1.1.1 saved' });
    expect(treeRow('1.1.1').getAttribute('aria-selected')).toBe('true');
    expect(treeRow('1.1.1').querySelector('[data-testid="framework-tree-name"]')?.textContent?.trim()).toBe('Process efficiency updated');
  });

  it('does not ask to discard a name that was just saved', async () => {
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok(SEEDED));
    create();
    await settle();
    await clickTree('1.1.1');
    await typeInto('#elementName', 'Process efficiency updated');
    api.PATCH_StrategyFrameworkElement.mockResolvedValue(ok({ ...SEEDED.elements[3], name: 'Process efficiency updated' }));
    api.GET_StrategyFrameworkEditor.mockResolvedValue(
      ok({
        ...SEEDED,
        elements: SEEDED.elements.map(item => (item.id === 31 ? { ...item, name: 'Process efficiency updated' } : item))
      })
    );
    (document.querySelector('[data-testid="element-save"] button') as HTMLButtonElement).click();
    await settle();
    actions.showGlobalAlert.mockClear();

    await clickTree('1.1.2');

    expect(actions.showGlobalAlert).not.toHaveBeenCalled();
    expect((document.querySelector('#elementName') as HTMLInputElement).value).toBe('Quality');
  });

  it('keeps the saved name when Cancel follows Save', async () => {
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok(SEEDED));
    create();
    await settle();
    await clickTree('1.1.1');
    await typeInto('#elementName', 'Process efficiency updated');
    api.PATCH_StrategyFrameworkElement.mockResolvedValue(ok({ ...SEEDED.elements[3], name: 'Process efficiency updated' }));
    api.GET_StrategyFrameworkEditor.mockResolvedValue(
      ok({
        ...SEEDED,
        elements: SEEDED.elements.map(item => (item.id === 31 ? { ...item, name: 'Process efficiency updated' } : item))
      })
    );
    (document.querySelector('[data-testid="element-save"] button') as HTMLButtonElement).click();
    await settle();

    (document.querySelector('[data-testid="element-cancel"] button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect((document.querySelector('#elementName') as HTMLInputElement).value).toBe('Process efficiency updated');
    expect(treeRow('1.1.1').getAttribute('aria-selected')).toBe('true');
  });

  it('keeps a created element when Cancel follows Save', async () => {
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok(SEEDED));
    api.GET_StrategyFrameworkCodeProposal.mockImplementation((query: { parentId?: number }) =>
      Promise.resolve(ok({ code: query.parentId ? '1.7' : '4' }))
    );
    const created = element({ id: 40, depth: 2, code: '1.7', name: 'Added dimension', parentId: 1 });
    api.POST_StrategyFrameworkElement.mockResolvedValue(ok(created));
    create();
    await settle();
    (treeRow('1').querySelector('[data-testid="framework-tree-add"]') as HTMLButtonElement).click();
    await settle();
    await typeInto('#elementName', 'Added dimension');
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok({ ...SEEDED, elements: [...SEEDED.elements, created] }));

    (document.querySelector('[data-testid="element-save"] button') as HTMLButtonElement).click();
    await settle();
    (document.querySelector('[data-testid="element-cancel"] button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect((document.querySelector('#elementName') as HTMLInputElement).value).toBe('Added dimension');
    expect((document.querySelector('#elementCode') as HTMLInputElement).value).toBe('1.7');
    expect(actions.showGlobalAlert).not.toHaveBeenCalled();
  });

  it('keeps text typed while a save is in flight and still asks before leaving', async () => {
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok(SEEDED));
    create();
    await settle();
    await clickTree('1.1.1');
    await typeInto('#elementName', 'X');
    let resolvePatch: (value: MainResponse<FrameworkEditorElement>) => void = () => undefined;
    api.PATCH_StrategyFrameworkElement.mockReturnValue(new Promise(resolve => (resolvePatch = resolve)));
    api.GET_StrategyFrameworkEditor.mockResolvedValue(
      ok({
        ...SEEDED,
        elements: SEEDED.elements.map(item => (item.id === 31 ? { ...item, name: 'X' } : item))
      })
    );
    (document.querySelector('[data-testid="element-save"] button') as HTMLButtonElement).click();
    await typeInto('#elementName', 'XY');
    resolvePatch(ok({ ...SEEDED.elements[3], name: 'X' }));
    await settle();

    expect((document.querySelector('#elementName') as HTMLInputElement).value).toBe('XY');
    actions.showGlobalAlert.mockClear();
    await clickTree('1.1.2');
    expect(lastAlert().summary).toBe('Discard changes?');
    expect((document.querySelector('#elementName') as HTMLInputElement).value).toBe('XY');
  });

  it('keeps text typed while a create is saving, and edits the new id after refresh', async () => {
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok(SEEDED));
    api.GET_StrategyFrameworkCodeProposal.mockImplementation((query: { parentId?: number }) =>
      Promise.resolve(ok({ code: query.parentId ? '1.7' : '4' }))
    );
    const created = element({ id: 40, depth: 2, code: '1.7', name: 'X', parentId: 1 });
    create();
    await settle();
    (treeRow('1').querySelector('[data-testid="framework-tree-add"]') as HTMLButtonElement).click();
    await settle();
    await typeInto('#elementName', 'X');
    let resolvePost: (value: MainResponse<FrameworkEditorElement>) => void = () => undefined;
    api.POST_StrategyFrameworkElement.mockReturnValue(new Promise(resolve => (resolvePost = resolve)));
    (document.querySelector('[data-testid="element-save"] button') as HTMLButtonElement).click();
    await typeInto('#elementName', 'XY');
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok({ ...SEEDED, elements: [...SEEDED.elements, created] }));
    resolvePost(ok(created));
    await settle();

    expect((document.querySelector('#elementName') as HTMLInputElement).value).toBe('XY');
    expect(document.querySelector('[data-testid="element-delete"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="panel-title"]')?.textContent?.trim()).not.toContain('New');
    expect(treeRow('1.7').getAttribute('aria-selected')).toBe('true');
  });

  it('does not ask to discard a saved edit before the refresh returns', async () => {
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok(SEEDED));
    create();
    await settle();
    await clickTree('1.1.1');
    await typeInto('#elementName', 'Process efficiency updated');
    let resolvePatch: (value: MainResponse<FrameworkEditorElement>) => void = () => undefined;
    let resolveGet: (value: MainResponse<FrameworkEditorView>) => void = () => undefined;
    api.PATCH_StrategyFrameworkElement.mockReturnValue(new Promise(resolve => (resolvePatch = resolve)));
    (document.querySelector('[data-testid="element-save"] button') as HTMLButtonElement).click();
    api.GET_StrategyFrameworkEditor.mockReturnValue(new Promise(resolve => (resolveGet = resolve)));
    resolvePatch(ok({ ...SEEDED.elements[3], name: 'Process efficiency updated' }));
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
    actions.showGlobalAlert.mockClear();

    (treeRow('1.1.2').querySelector('[data-testid="framework-tree-name"]') as HTMLElement).click();
    fixture.detectChanges();

    expect(actions.showGlobalAlert).not.toHaveBeenCalled();
    expect((document.querySelector('#elementName') as HTMLInputElement).value).toBe('Quality');
    resolveGet(ok(SEEDED));
    await settle();
  });

  it('asks before replacing a dirty form, and Keep editing leaves the text and the selection', async () => {
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok(SEEDED));
    create();
    await settle();
    await clickTree('1.1.1');
    await typeInto('#elementDescription', 'edited text');
    await clickTree('1.1.1');
    expect(actions.showGlobalAlert).not.toHaveBeenCalled();

    await clickTree('1.1.2');
    expect(lastAlert().summary).toBe('Discard changes?');
    expect(lastAlert().detail).toBe('Your edits to 1.1.1 will be lost.');
    expect(lastAlert().cancelCallback?.label).toBe('Keep editing');
    await answer('Keep editing');

    expect((document.querySelector('#elementDescription') as HTMLTextAreaElement).value).toBe('edited text');
    expect(treeRow('1.1.1').getAttribute('aria-selected')).toBe('true');
    expect(treeRow('1.1.2').getAttribute('aria-selected')).toBe('false');
    expect((document.querySelector('#elementName') as HTMLInputElement).value).toBe('Process efficiency');
  });

  it('discards into the clicked row, and ignores a second click while the prompt is open', async () => {
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok(SEEDED));
    create();
    await settle();
    await clickTree('1.1.1');
    await typeInto('#elementDescription', 'edited text');
    await clickTree('1.1.2');
    await clickTree('1.2');
    expect(actions.showGlobalAlert).toHaveBeenCalledTimes(1);

    await answer('Discard');
    expect((document.querySelector('#elementName') as HTMLInputElement).value).toBe('Quality');
    expect(treeRow('1.1.2').getAttribute('aria-selected')).toBe('true');
    expect(treeRow('1.2').getAttribute('aria-selected')).toBe('false');
  });

  it('does nothing when a level chip is clicked', async () => {
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok(SEEDED));
    create();
    await settle();
    await clickTree('1.1.1');
    (q('view-table') as HTMLButtonElement).click();
    await settle();
    await typeInto('#elementDescription', 'edited text');
    const writes = router.navigate.mock.calls.length;

    (root().querySelector('[data-testid="level-chip"][data-depth="1"]') as HTMLElement).click();
    await settle();

    expect(actions.showGlobalAlert).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledTimes(writes);
    expect((document.querySelector('#elementDescription') as HTMLTextAreaElement).value).toBe('edited text');
    expect(root().querySelector('[data-row-key="31"]')?.getAttribute('aria-selected')).toBe('true');
    expect(Array.from(root().querySelectorAll('[data-testid="cell-code"]')).map(cell => cell.textContent?.trim())).toEqual([
      '1',
      '1.1',
      '1.1.1',
      '1.1.2',
      '1.2'
    ]);
  });

  it('guards create, the portfolio and the view the same way', async () => {
    api.GET_StrategyFrameworkEditor.mockImplementation((id: number) => Promise.resolve(ok(id === 1 ? EMPTY : SEEDED)));
    api.GET_StrategyFrameworkCodeProposal.mockResolvedValue(ok({ code: '4' }));
    create();
    await settle();
    await clickTree('1.1.1');
    await typeInto('#elementDescription', 'edited text');

    (q('new-element')?.querySelector('button') as HTMLButtonElement).click();
    await settle();
    expect(lastAlert().detail).toBe('Your edits to 1.1.1 will be lost.');
    await answer('Keep editing');
    expect((document.querySelector('#elementDescription') as HTMLTextAreaElement).value).toBe('edited text');
    expect(document.querySelector('[data-testid="panel-title"]')?.textContent?.trim()).toBe('Process efficiency');

    (q('view-table') as HTMLButtonElement).click();
    await settle();
    await answer('Keep editing');
    expect(q('view-tree')?.getAttribute('aria-pressed')).toBe('true');

    await answer('Discard');
    expect(q('view-table')?.getAttribute('aria-pressed')).toBe('true');
    expect(root().querySelector('[data-row-key="31"]')?.getAttribute('aria-selected')).toBe('true');
    expect((document.querySelector('#elementDescription') as HTMLTextAreaElement).value).toBe('Stored text');
    expect(actions.showGlobalAlert).toHaveBeenCalledTimes(2);
    expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { view: 'table', level: null } }));

    (q('view-tree') as HTMLButtonElement).click();
    await settle();
    await clickTree('1.1.1');
    await typeInto('#elementDescription', 'portfolio edit');
    fixture.debugElement.query(By.directive(Select)).triggerEventHandler('onChange', { value: 1 });
    await settle();
    await answer('Keep editing');
    expect(component.portfolioId()).toBe(2);
    expect((document.querySelector('#elementDescription') as HTMLTextAreaElement).value).toBe('portfolio edit');

    await answer('Discard');
    expect(component.portfolioId()).toBe(1);
    expect(q('empty-state')).not.toBeNull();
    expect(document.querySelector('[data-testid="element-form"]')).toBeNull();
  });

  it('shows the current portfolio label again when Keep editing rejects the change', async () => {
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok(SEEDED));
    create();
    await settle();
    await clickTree('1.1.1');
    await typeInto('#elementDescription', 'portfolio edit');
    const select = fixture.debugElement.query(By.css('[data-testid="portfolio-select"]')).componentInstance as Select;
    const rejected = (select.options as { id: number }[]).find(option => option.id === 1);
    select.onOptionSelect(new Event('click'), rejected);
    await settle();
    await answer('Keep editing');

    expect(component.portfolioId()).toBe(2);
    expect(root().querySelector('[data-testid="portfolio-select"] .p-select-label')?.textContent).toContain('Portfolio 2');
    expect(root().querySelector('[data-testid="portfolio-select"] .p-select-label')?.textContent).not.toContain('Portfolio 1');
    expect((document.querySelector('#elementDescription') as HTMLTextAreaElement).value).toBe('portfolio edit');
  });

  it('shows the new portfolio label when a clean change proceeds, and clears the selection', async () => {
    api.GET_StrategyFrameworkEditor.mockImplementation((id: number) => Promise.resolve(ok(id === 1 ? EMPTY : SEEDED)));
    create();
    await settle();
    await clickTree('1.1.1');

    await pickPortfolio(1);

    expect(actions.showGlobalAlert).not.toHaveBeenCalled();
    expect(component.portfolioId()).toBe(1);
    expect(portfolioLabel()).toContain('Portfolio 1');
    expect(portfolioLabel()).not.toContain('Portfolio 2');
    expect(component.selectedId()).toBeNull();
    expect(q('empty-state')?.textContent).toContain('This portfolio has no framework yet');
    expect(q('panel-empty')?.textContent).toContain('Explore the performance framework');
  });

  it('shows the new portfolio label when Discard proceeds, and clears the selection', async () => {
    api.GET_StrategyFrameworkEditor.mockImplementation((id: number) => Promise.resolve(ok(id === 1 ? EMPTY : SEEDED)));
    create();
    await settle();
    await clickTree('1.1.1');
    await typeInto('#elementDescription', 'portfolio edit');

    await pickPortfolio(1);
    expect(lastAlert().summary).toBe('Discard changes?');
    await answer('Discard');

    expect(component.portfolioId()).toBe(1);
    expect(portfolioLabel()).toContain('Portfolio 1');
    expect(portfolioLabel()).not.toContain('Portfolio 2');
    expect(component.selectedId()).toBeNull();
    expect(q('empty-state')?.textContent).toContain('This portfolio has no framework yet');
    expect(q('panel-empty')?.textContent).toContain('Explore the performance framework');
  });

  it('opens + Dimension with the parent and the proposed code, and adds nothing until save', async () => {
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok(SEEDED));
    api.GET_StrategyFrameworkCodeProposal.mockImplementation((query: { parentId?: number }) =>
      Promise.resolve(ok({ code: query.parentId ? '1.7' : '4' }))
    );
    create();
    await settle();
    const before = Array.from(root().querySelectorAll('[data-testid="framework-tree-code"]')).map(node => node.textContent?.trim());

    (treeRow('1').querySelector('[data-testid="framework-tree-add"]') as HTMLButtonElement).click();
    await settle();

    expect(api.GET_StrategyFrameworkCodeProposal).toHaveBeenCalledWith({ portfolioId: 2, parentId: 1 });
    expect((document.querySelector('#elementCode') as HTMLInputElement).value).toBe('1.7');
    const panel = fixture.debugElement.query(By.directive(ElementPanelComponent)).componentInstance as ElementPanelComponent;
    expect(panel.form.controls.parentId.value).toBe(1);
    expect(document.querySelector('[data-testid="panel-title"]')?.textContent?.trim()).toBe('New Dimension');
    expect(document.querySelector('[data-testid="element-delete"]')).toBeNull();
    expect(Array.from(root().querySelectorAll('[data-testid="framework-tree-code"]')).map(node => node.textContent?.trim())).toEqual(before);
    expect(before).not.toContain('1.7');
    expect(root().querySelector('[data-testid="framework-tree-row"][aria-selected="true"]')).toBeNull();
  });

  it('keeps a failed save in the panel', async () => {
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok(SEEDED));
    api.PATCH_StrategyFrameworkElement.mockResolvedValue(failed(409, { description: 'code is taken', field: 'code' }));
    create();
    await settle();
    await clickTree('1.1.1');
    await typeInto('#elementName', 'Process efficiency edited');
    (document.querySelector('[data-testid="element-save"] button') as HTMLButtonElement).click();
    await settle();

    expect((document.querySelector('#elementName') as HTMLInputElement).value).toBe('Process efficiency edited');
    expect(document.querySelector('[data-testid="element-error"]')?.textContent?.trim()).toBe('code is taken');
    expect(actions.showToast).not.toHaveBeenCalled();
    expect(treeRow('1.1.1').getAttribute('aria-selected')).toBe('true');
  });

  it('ignores a save response for a selection that is no longer current', async () => {
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok(SEEDED));
    create();
    await settle();
    await clickTree('1.1.1');
    await typeInto('#elementName', 'Stale name');
    let resolvePatch: (value: MainResponse<FrameworkEditorElement>) => void = () => undefined;
    api.PATCH_StrategyFrameworkElement.mockReturnValue(new Promise(resolve => (resolvePatch = resolve)));
    (document.querySelector('[data-testid="element-save"] button') as HTMLButtonElement).click();
    await clickTree('1.1.2');
    await answer('Discard');

    resolvePatch(ok({ ...SEEDED.elements[3], name: 'Stale name' }));
    await settle();

    expect(actions.showToast).not.toHaveBeenCalled();
    expect((document.querySelector('#elementName') as HTMLInputElement).value).toBe('Quality');
    expect(treeRow('1.1.2').getAttribute('aria-selected')).toBe('true');
  });

  it('deletes from the panel and moves focus to the next visible row', async () => {
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok(SEEDED));
    create();
    await settle();
    await clickTree('1.1.1');
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok({ ...SEEDED, elements: SEEDED.elements.filter(item => item.id !== 31) }));
    fixture.autoDetectChanges(true);
    (document.querySelector('[data-testid="element-delete"] button') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(lastAlert().detail).toBe('Delete Indicator 1.1.1 · Process efficiency?');
    expect(lastAlert().confirmCallback?.label).toBe('Delete');
    expect(lastAlert().hideCloseButton).toBe(true);
    await TestBed.inject(NgZone).run(() => lastAlert().confirmCallback?.event?.());
    await fixture.whenStable();

    expect(api.DELETE_StrategyFrameworkElement).toHaveBeenCalledWith(31);
    expect(treeRow('1.1.1')).toBeUndefined();
    expect(document.activeElement?.getAttribute('data-row-key')).toBe('32');
  });

  it('blocks delete with a Close-only dialog and returns focus to Delete', async () => {
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok(SEEDED));
    api.GET_StrategyFrameworkElementBlockers.mockResolvedValue(
      ok({ children: 2, objectives: 0, consumers: [], wayOut: ['Delete or move its 2 indicators first.'] })
    );
    create();
    await settle();
    await clickTree('1');
    const button = document.querySelector('[data-testid="element-delete"] button') as HTMLButtonElement;
    button.click();
    await settle();

    expect(api.DELETE_StrategyFrameworkElement).not.toHaveBeenCalled();
    expect(lastAlert().summary).toBe('Cannot delete');
    expect(lastAlert().confirmCallback?.label).toBe('Close');
    expect(lastAlert().hasNoCancelButton).toBe(true);
    expect(lastAlert().hideCloseButton).toBe(true);
    expect(lastAlert().detail).toContain('2 children');
    (document.body as HTMLElement).focus();
    lastAlert().confirmCallback?.event?.();
    expect(document.activeElement).toBe(button);
  });
});
