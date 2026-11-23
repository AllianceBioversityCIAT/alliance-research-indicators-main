import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { Select } from 'primeng/select';
import { FrameworkContext, FrameworkEditorView, FrameworkLevel } from '@shared/interfaces/strategy-framework.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import * as xlsxExportUtil from '@shared/utils/xlsx-export.util';
import FrameworkComponent from './framework.component';

// @akili-spec institutional-performance/strategy-framework T-12 — R-STF-001, R-STF-007, R-STF-008,
// R-STF-015 AC.2, D-STF-23, D-STF-26, P-36. The page is the real component. KZ-015: loading is
// asserted before the response resolves. Framework errors stay inline; handleBadRequest is not called.

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
  levels: LEVELS.map(level => ({
    id: level.depth,
    depth: level.depth,
    name: level.name,
    pluralName: level.pluralName,
    shortLabel: level.shortLabel,
    isIndicatorLevel: level.isIndicatorLevel
  })),
  usageLabels: [],
  elements: [
    {
      id: 1,
      levelId: 1,
      depth: 1,
      code: '1',
      name: 'Area',
      description: null,
      parentId: null,
      descendantCounts: {},
      usage: {},
      deletable: true,
      blockers: []
    }
  ]
};

const EMPTY: FrameworkEditorView = {
  portfolioId: 1,
  configured: false,
  levels: LEVELS,
  elements: [],
  usageLabels: []
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
  };
  const create = () => {
    fixture = TestBed.createComponent(FrameworkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
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
      DELETE_StrategyFrameworkElement: jest.fn(),
      GET_StrategyFrameworkElementBlockers: jest.fn()
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
    document.querySelectorAll('.p-drawer, .p-drawer-mask, .p-overlay-mask').forEach(node => node.remove());
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
    expect(root().textContent).toContain('Define the performance areas, dimensions and indicators of the framework.');
    expect(component.portfolioId()).toBe(2);
    expect(q('summary-line')?.textContent?.trim()).toBe('1 performance area · 0 dimensions · 0 indicators');
    const outlineName = q('outline-editor-slot')?.querySelector('[data-testid="name-input"]') as HTMLInputElement | null;
    expect(outlineName?.value).toBe('Area');
    expect(q('outline-editor-slot')?.querySelector('[data-testid="code-badge"]')?.textContent?.trim()).toBe('1');
    expect(q('framework-banner')?.textContent).toContain('Changes apply to every module that uses the framework. Items in use cannot be deleted.');
    expect(root().querySelector('app-custom-progress-bar')).toBeNull();
  });

  it('labels an unconfigured portfolio and shows + Add Performance Area when it has no levels', async () => {
    create();
    await settle();

    const unconfigured = component.portfolioOptions().find(portfolio => portfolio.id === 1);
    expect(unconfigured?.label).toBe('Portfolio 1 · 2020–2021 (not configured)');
    expect(component.portfolioOptions().find(portfolio => portfolio.id === 2)?.label).toBe('Portfolio 2 · 2026–2030');

    fixture.debugElement.query(By.directive(Select)).triggerEventHandler('onChange', { value: 1 });
    await settle();

    expect(q('empty-state')?.textContent).toContain('This portfolio has no framework yet');
    expect(q('add-root-button')?.textContent).toContain('+ Add Performance Area');
    expect(q('summary-line')).toBeNull();

    (q('add-root-button')?.querySelector('button') as HTMLButtonElement).click();
    await settle();
    expect(component.rootDraftRequested()).toBe(true);
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
    expect(q('outline-editor-slot')).toBeNull();
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
    expect(root().textContent).not.toContain('Title Already Exists');
    expect(root().textContent).not.toContain('Enter other title');
    expect(actions.handleBadRequest).not.toHaveBeenCalled();
    expect(actions.showGlobalAlert).not.toHaveBeenCalled();
  });

  it('retries a failed load into the framework', async () => {
    api.GET_StrategyFrameworkEditor.mockResolvedValueOnce(failed(500, 'The framework read failed')).mockResolvedValue(ok(WITH_ELEMENTS));
    create();
    await settle();
    expect(q('error-state')?.textContent).toContain('The framework read failed');

    (q('retry-button')?.querySelector('button') as HTMLButtonElement).click();
    await settle();

    expect(q('error-state')).toBeNull();
    expect(q('page-title')?.textContent?.trim()).toBe('Strategy 2026–2030 – Monitoring framework');
    expect(q('outline-editor-slot')).not.toBeNull();
  });

  it('reads the frozen view and level slugs, and falls back when they are unknown', async () => {
    query = { view: 'table', level: 'depth-2' };
    create();
    await settle();
    expect(component.view()).toBe('table');
    expect(component.level()).toBe(2);
    expect(q('view-table')?.getAttribute('aria-pressed')).toBe('true');
    expect(q('framework-tables-slot')).not.toBeNull();
    expect(q('outline-editor-slot')).toBeNull();

    (q('view-editor') as HTMLButtonElement).click();
    await settle();
    expect(component.view()).toBe('editor');
    expect(q('outline-editor-slot')).not.toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { view: null, level: 'depth-2' },
        queryParamsHandling: 'merge',
        replaceUrl: true
      })
    );
  });

  it('falls back to the editor when the view slug is not in the vocabulary', async () => {
    query = { view: 'cards', level: 'performance-area' };
    create();
    await settle();
    expect(component.view()).toBe('editor');
    expect(component.level()).toBeNull();
    expect(q('outline-editor-slot')).not.toBeNull();
  });

  it('records the details selection for the panel slot', async () => {
    create();
    await settle();

    (q('outline-editor-slot')?.querySelector('[data-testid="details"]') as HTMLButtonElement).click();
    await settle();

    expect(component.detailsElementId()).toBe(1);
    expect(q('element-panel-slot')?.getAttribute('data-element-id')).toBe('1');
    expect((document.querySelector('#elementCode') as HTMLInputElement).value).toBe('1');
  });

  it('returns focus to the outline control that opened the panel', async () => {
    create();
    await settle();

    const opener = q('outline-editor-slot')?.querySelector('[data-testid="details"]') as HTMLButtonElement;
    opener.focus();
    opener.click();
    await settle();
    expect(document.querySelector('[data-testid="element-form"]')).not.toBeNull();

    (document.querySelector('[data-testid="element-cancel"] button') as HTMLButtonElement).click();
    await settle();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(opener);
    expect(document.querySelector('[data-testid="element-form"]')).toBeNull();
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
    expect(input.sheets).toHaveLength(WITH_ELEMENTS.levels.length);
    expect(input.sheets.map(sheet => sheet.name)).toEqual(['Performance Areas', 'Dimensions', 'Indicators']);
  });

  it('writes the level slug from a chip and opens the panel selection from the row edit', async () => {
    query = { view: 'table' };
    create();
    await settle();

    const edit = q('framework-tables-slot')?.querySelector('[data-testid="edit-row"]') as HTMLButtonElement;
    edit.click();
    await settle();

    expect(component.detailsElementId()).toBe(1);
    expect(q('element-panel-slot')?.getAttribute('data-element-id')).toBe('1');
    expect(document.querySelector('[data-testid="element-form"]')).not.toBeNull();
    (document.querySelector('[data-testid="element-cancel"] button') as HTMLButtonElement).click();
    await settle();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(edit);

    (q('framework-tables-slot')?.querySelector('[data-testid="level-chip"][data-depth="2"]') as HTMLButtonElement).click();
    await settle();

    expect(component.level()).toBe(2);
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { view: 'table', level: 'depth-2' },
        queryParamsHandling: 'merge',
        replaceUrl: true
      })
    );
  });

  it('records an empty create from + Level, and requires a parent below the first level', async () => {
    query = { view: 'table' };
    create();
    await settle();

    (q('framework-tables-slot')?.querySelector('[data-testid="level-table"][data-depth="1"] [data-testid="add-level"] button') as HTMLButtonElement).click();
    await settle();
    expect(component.createRequest()).toEqual({ depth: 1, parentRequired: false });
    expect(component.detailsElementId()).toBeNull();

    (q('framework-tables-slot')?.querySelector('[data-testid="level-chip"][data-depth="2"]') as HTMLButtonElement).click();
    await settle();
    (q('framework-tables-slot')?.querySelector('[data-testid="level-table"][data-depth="2"] [data-testid="add-level"] button') as HTMLButtonElement).click();
    await settle();

    expect(component.createRequest()).toEqual({ depth: 2, parentRequired: true });
    expect(q('element-panel-slot')?.getAttribute('data-element-id')).toBeNull();
  });

  it('closes only the Parent select on Escape, then the drawer, and returns focus to the opener', async () => {
    const media = installMatchMedia();
    api.GET_StrategyFrameworkEditor.mockResolvedValue(
      ok({
        ...WITH_ELEMENTS,
        elements: [
          ...WITH_ELEMENTS.elements,
          {
            id: 20,
            levelId: 2,
            depth: 2,
            code: '1.1',
            name: 'Dimension one',
            description: null,
            parentId: 1,
            descendantCounts: {},
            usage: {},
            deletable: true,
            blockers: []
          }
        ]
      })
    );
    try {
      create();
      await settle();

      const opener = root().querySelector('[aria-label="Edit details of Dimension 1.1"]') as HTMLButtonElement;
      opener.focus();
      opener.click();
      await settle();
      expect(document.querySelector('[data-testid="element-form"]')).not.toBeNull();

      const name = document.querySelector('#elementName') as HTMLInputElement;
      name.value = 'Dimension one edited';
      name.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();

      const parent = document.querySelector('[data-testid="element-parent"]') as HTMLElement;
      parent.click();
      await settle();
      const overlay = document.querySelector('.p-select-overlay');
      expect(overlay).not.toBeNull();
      const filter = overlay?.querySelector('input') ?? overlay;
      pressEscape(filter as HTMLElement);
      await settle();

      expect(document.querySelector('[data-testid="element-form"]')).not.toBeNull();
      expect(document.querySelector('.p-select-overlay')).toBeNull();
      expect((document.querySelector('#elementName') as HTMLInputElement).value).toBe('Dimension one edited');

      pressEscape(document.querySelector('#elementCode') as HTMLElement);
      await settle();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(document.querySelector('[data-testid="element-form"]')).toBeNull();
      expect(document.activeElement).toBe(opener);
    } finally {
      media.restore();
    }
  });

  it('closes the drawer on Escape when an unrelated control outside the panel is expanded', async () => {
    const media = installMatchMedia();
    api.GET_StrategyFrameworkEditor.mockResolvedValue(
      ok({
        ...WITH_ELEMENTS,
        elements: [
          ...WITH_ELEMENTS.elements,
          {
            id: 20,
            levelId: 2,
            depth: 2,
            code: '1.1',
            name: 'Dimension one',
            description: null,
            parentId: 1,
            descendantCounts: {},
            usage: {},
            deletable: true,
            blockers: []
          }
        ]
      })
    );
    const outside = document.createElement('button');
    outside.setAttribute('aria-expanded', 'true');
    outside.setAttribute('data-testid', 'unrelated-expanded');
    document.body.appendChild(outside);
    try {
      create();
      await settle();

      const opener = root().querySelector('[aria-label="Edit details of Dimension 1.1"]') as HTMLButtonElement;
      opener.click();
      await settle();
      expect(document.querySelector('[data-testid="element-form"]')).not.toBeNull();
      expect(document.querySelector('[data-testid="element-form"]')?.contains(outside)).toBe(false);

      pressEscape(document.querySelector('#elementCode') as HTMLElement);
      await settle();
      expect(document.querySelector('[data-testid="element-form"]')).toBeNull();
    } finally {
      outside.remove();
      media.restore();
    }
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
