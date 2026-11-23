import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import {
  FrameworkEditorElement,
  FrameworkEditorView,
  FrameworkElementBlockers,
  FrameworkLevel,
  FrameworkResponsible
} from '@shared/interfaces/strategy-framework.interface';
import { GlobalAlert } from '@shared/interfaces/global-alert.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import * as xlsxExportUtil from '@shared/utils/xlsx-export.util';
import { FrameworkTableCreate, FrameworkTablesComponent } from './framework-tables.component';

// @akili-spec institutional-performance/strategy-framework T-14 — R-STF-008 AC.1–AC.2, design §6.4,
// D-STF-12, P-23. KZ-001: chips, columns and row actions are read from the DOM.
// KZ-015: the chip and the row action are clicked. KZ-017: jsdom cannot drag a column to measure resize.

const ok = <T>(data: T): MainResponse<T> =>
  ({ data, status: 200, description: 'ok', timestamp: '', path: '', successfulRequest: true }) as MainResponse<T>;

const LEVELS: FrameworkLevel[] = [
  { id: 1, depth: 1, name: 'Performance Area', pluralName: 'Performance Areas', shortLabel: 'AREA', isIndicatorLevel: false },
  { id: 2, depth: 2, name: 'Dimension', pluralName: 'Dimensions', shortLabel: 'DIMENSION', isIndicatorLevel: false },
  { id: 3, depth: 3, name: 'Indicator', pluralName: 'Indicators', shortLabel: 'INDICATOR', isIndicatorLevel: true }
];

const FOUR_LEVELS: FrameworkLevel[] = [
  ...LEVELS,
  { id: 4, depth: 4, name: 'Sub-indicator', pluralName: 'Sub-indicators', shortLabel: 'SUB', isIndicatorLevel: false }
];

const responsibles: FrameworkResponsible[] = [
  { carnet: 'IJ', name: 'Idris Jones', email: 'ij@alliance.org', isActiveStaff: true },
  { carnet: 'PA', name: 'Philippe Attey', email: null, isActiveStaff: false }
];

const element = (partial: Partial<FrameworkEditorElement> & Pick<FrameworkEditorElement, 'id' | 'depth' | 'code' | 'name'>): FrameworkEditorElement => ({
  levelId: partial.depth,
  description: null,
  parentId: null,
  descendantCounts: {},
  usage: {},
  deletable: true,
  blockers: [],
  ...partial
});

const viewOf = (elements: FrameworkEditorElement[], levels: FrameworkLevel[] = LEVELS, portfolioId = 2): FrameworkEditorView => ({
  portfolioId,
  configured: elements.length > 0,
  levels,
  elements,
  usageLabels: []
});

const freeBlockers = (): FrameworkElementBlockers => ({ children: 0, objectives: 0, consumers: [], wayOut: [] });

/** One chain through four levels. The fourth level is not named anywhere in the component. */
const fourLevelView = (): FrameworkEditorView =>
  viewOf(
    [
      element({ id: 1, depth: 1, code: '1', name: 'Area' }),
      element({ id: 2, depth: 2, code: '1.1', name: 'Dimension', parentId: 1 }),
      element({ id: 3, depth: 3, code: '1.1.1', name: 'Indicator', parentId: 2, responsibles }),
      element({ id: 4, depth: 4, code: '1.1.1.1', name: 'Sub', parentId: 3 })
    ],
    FOUR_LEVELS,
    9
  );

describe('FrameworkTablesComponent', () => {
  let fixture: ComponentFixture<FrameworkTablesComponent>;
  let api: {
    GET_StrategyFrameworkEditor: jest.Mock;
    DELETE_StrategyFrameworkElement: jest.Mock;
    GET_StrategyFrameworkElementBlockers: jest.Mock;
  };
  let alerts: GlobalAlert[];

  const root = () => fixture.nativeElement as HTMLElement;
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();
  };
  const mount = async (view: FrameworkEditorView, level: number | null = null) => {
    fixture = TestBed.createComponent(FrameworkTablesComponent);
    fixture.componentRef.setInput('view', view);
    fixture.componentRef.setInput('level', level);
    await settle();
  };
  const chips = () => Array.from(root().querySelectorAll('[data-testid="level-chip"]')) as HTMLButtonElement[];
  const chip = (depth: number) => root().querySelector(`[data-testid="level-chip"][data-depth="${depth}"]`) as HTMLButtonElement;
  const panel = (depth: number) => root().querySelector(`[data-testid="level-table"][data-depth="${depth}"]`) as HTMLElement;
  const visible = () => root().querySelector('[data-testid="level-table"]:not([hidden])') as HTMLElement;
  const headers = (depth: number) =>
    Array.from(panel(depth).querySelectorAll('th')).map(cell => cell.textContent?.replace(/\s+/g, ' ').trim());
  const codes = (depth: number) =>
    Array.from(panel(depth).querySelectorAll('[data-testid="cell-code"]')).map(cell => cell.textContent?.trim());

  beforeEach(async () => {
    alerts = [];
    api = {
      GET_StrategyFrameworkEditor: jest.fn().mockResolvedValue(ok(viewOf([]))),
      DELETE_StrategyFrameworkElement: jest.fn().mockResolvedValue(ok({ id: 1 })),
      GET_StrategyFrameworkElementBlockers: jest.fn().mockResolvedValue(ok(freeBlockers()))
    };
    await TestBed.configureTestingModule({
      imports: [FrameworkTablesComponent],
      providers: [
        provideNoopAnimations(),
        { provide: ApiService, useValue: api },
        {
          provide: ActionsService,
          useValue: {
            showGlobalAlert: jest.fn((alert: GlobalAlert) => {
              alerts.push(alert);
            })
          }
        }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders one chip per level from the data, including a fourth level', async () => {
    await mount(fourLevelView());

    expect(chips().map(item => item.textContent?.trim())).toEqual([
      'Performance Areas · 1',
      'Dimensions · 1',
      'Indicators · 1',
      'Sub-indicators · 1'
    ]);
    expect(chips()).toHaveLength(4);
    const group = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="level-chips"]');
    expect(group?.getAttribute('role')).toBe('group');
    expect(group?.getAttribute('aria-label')).toBe('Levels');
    expect(chip(1).getAttribute('role')).toBeNull();
    expect(chip(1).getAttribute('aria-checked')).toBeNull();
    expect(chip(1).getAttribute('aria-pressed')).toBe('true');
    expect(chip(2).getAttribute('aria-pressed')).toBe('false');
    expect(chip(1).classList.contains('level-chip--active')).toBe(true);
    expect(visible().getAttribute('data-depth')).toBe('1');
  });

  it('labels the seeded three levels with their counts', async () => {
    const elements: FrameworkEditorElement[] = [];
    for (let area = 1; area <= 4; area++) {
      elements.push(element({ id: area, depth: 1, code: String(area), name: `Area ${area}` }));
    }
    for (let dimension = 1; dimension <= 13; dimension++) {
      const area = dimension <= 10 ? 1 : 2;
      elements.push(element({ id: 100 + dimension, depth: 2, code: `${area}.${dimension}`, name: `Dimension ${dimension}`, parentId: area }));
    }
    for (let indicator = 1; indicator <= 31; indicator++) {
      elements.push(element({ id: 1000 + indicator, depth: 3, code: `1.1.${indicator}`, name: `Indicator ${indicator}`, parentId: 101 }));
    }
    await mount(viewOf(elements));

    expect(chips().map(item => item.textContent?.trim())).toEqual(['Performance Areas · 4', 'Dimensions · 13', 'Indicators · 31']);
  });

  it('shows each level’s columns after its chip is clicked, and marks an inactive responsible', async () => {
    await mount(fourLevelView());

    expect(headers(1)).toEqual(['Code', 'Name', 'Actions']);

    chip(2).click();
    await settle();
    expect(chip(2).getAttribute('aria-pressed')).toBe('true');
    expect(chip(1).getAttribute('aria-pressed')).toBe('false');
    expect(chip(2).getAttribute('aria-checked')).toBeNull();
    expect(visible().getAttribute('data-depth')).toBe('2');
    expect(headers(2)).toEqual(['Code', 'Name', 'Performance Area', 'Actions']);
    expect(panel(2).querySelector('[data-testid="cell-parentCode"]')).toBeNull();
    expect(panel(2).querySelector('[data-testid="cell-1Ancestor"]')?.textContent?.trim()).toBe('1 · Area');

    chip(3).click();
    await settle();
    expect(headers(3)).toEqual(['Code', 'Name', 'Performance Area', 'Dimension', 'Responsibles', 'Actions']);
    expect(panel(3).querySelector('[data-testid="cell-responsiblesText"]')?.textContent?.trim()).toBe('Idris Jones; Philippe Attey (inactive)');
    expect(panel(3).querySelector('[data-testid="cell-parentCode"]')).toBeNull();
    expect(panel(3).querySelector('[data-testid="cell-1Ancestor"]')?.textContent?.trim()).toBe('1 · Area');
    expect(panel(3).querySelector('[data-testid="cell-2Ancestor"]')?.textContent?.trim()).toBe('1.1 · Dimension');
    expect(panel(3).querySelector('[data-testid="edit-row"]')?.getAttribute('aria-label')).toBe('Edit details of Indicator 1.1.1');

    chip(4).click();
    await settle();
    expect(headers(4)).toEqual(['Code', 'Name', 'Performance Area', 'Dimension', 'Indicator', 'Actions']);
    expect(panel(4).querySelector('[data-testid="cell-responsiblesText"]')).toBeNull();
    expect(panel(4).querySelector('[data-testid="cell-parentCode"]')).toBeNull();
    expect(panel(4).querySelector('[data-testid="cell-3Ancestor"]')?.textContent?.trim()).toBe('1.1.1 · Indicator');
    expect(panel(4).querySelector('[data-testid="add-level"]')?.textContent).toContain('+ Sub-indicator');
  });

  it('sorts by code naturally, pages 10 rows, searches, and exports every filtered row', async () => {
    const codesOutOfOrder = ['1.12', '1.2', '1.10', '1.1', '1.11', '1.3', '1.9', '1.4', '1.8', '1.5', '1.7', '1.6'];
    const elements = [
      element({ id: 1, depth: 1, code: '1', name: 'Area' }),
      ...codesOutOfOrder.map((code, index) =>
        element({
          id: 10 + index,
          depth: 2,
          code,
          name: code === '1.10' ? 'Ten' : `Dimension ${code}`,
          parentId: 1
        })
      )
    ];
    await mount(viewOf(elements));
    chip(2).click();
    await settle();

    const naturalFirstPage = ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '1.10'];
    expect(codes(2)).toEqual(naturalFirstPage);
    expect(panel(2).querySelectorAll('[data-testid="data-table-row"]')).toHaveLength(10);

    const paginator = fixture.debugElement.query(By.css('[data-testid="level-table"][data-depth="2"] p-paginator')).componentInstance as {
      rows: number;
      rowsPerPageOptions: number[];
      changePage: (page: number) => void;
    };
    expect(panel(2).querySelector('.p-paginator-rpp-dropdown')).not.toBeNull();
    expect(paginator.rowsPerPageOptions).toEqual([10, 25, 50, 100]);
    paginator.rows = 25;
    paginator.changePage(0);
    await settle();
    expect(codes(2)).toEqual(['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '1.10', '1.11', '1.12']);

    paginator.rows = 10;
    paginator.changePage(0);
    await settle();
    const search = panel(2).querySelector('[data-testid="data-table-search"]') as HTMLInputElement;
    search.value = 'Ten';
    search.dispatchEvent(new Event('input'));
    await settle();
    expect(codes(2)).toEqual(['1.10']);

    const exportSpy = jest.spyOn(xlsxExportUtil, 'exportRowsToXlsx').mockResolvedValue(undefined);
    (panel(2).querySelector('[data-testid="data-table-export"]') as HTMLButtonElement).click();
    await settle();

    expect(exportSpy).toHaveBeenCalledTimes(1);
    const exported = exportSpy.mock.calls[0][0] as { rows: { code: string }[]; fileName: string };
    expect(exported.rows.map(row => row.code)).toEqual(['1.10']);
    expect(exported.fileName).toBe('strategy-framework_dimensions.xlsx');
  });

  it('opens the details selection from the edit action', async () => {
    const selected: number[] = [];
    await mount(fourLevelView());
    fixture.componentInstance.editRequested.subscribe(id => selected.push(id));

    (panel(1).querySelector('[data-testid="edit-row"]') as HTMLButtonElement).click();
    await settle();

    expect(selected).toEqual([1]);
    expect(panel(1).querySelector('[data-testid="edit-row"]')?.getAttribute('aria-label')).toBe('Edit details of Performance Area 1');
  });

  it('asks for an empty panel from + Level, and requires the parent below depth 1', async () => {
    const created: FrameworkTableCreate[] = [];
    await mount(fourLevelView());
    fixture.componentInstance.createRequested.subscribe(request => created.push(request));

    (panel(1).querySelector('[data-testid="add-level"] button') as HTMLButtonElement).click();
    await settle();
    chip(4).click();
    await settle();
    (panel(4).querySelector('[data-testid="add-level"] button') as HTMLButtonElement).click();
    await settle();

    expect(created).toEqual([
      { depth: 1, parentRequired: false },
      { depth: 4, parentRequired: true }
    ]);
  });

  it('confirms a free delete with the editor’s alert and moves focus to the previous row', async () => {
    const first = element({ id: 1, depth: 1, code: '1', name: 'Area one' });
    const second = element({ id: 2, depth: 1, code: '2', name: 'Area two' });
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok(viewOf([first])));
    await mount(viewOf([first, second]));

    const button = panel(1).querySelector('[data-testid="delete-row"][data-element-id="2"]') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Delete Performance Area 2');
    button.click();
    await settle();

    expect(alerts).toHaveLength(1);
    expect(alerts[0].detail).toBe('Delete Performance Area 2 · Area two?');
    expect(alerts[0].confirmCallback?.label).toBe('Delete');
    expect(alerts[0].cancelCallback?.label).toBe('Cancel');
    expect(alerts[0].hideCloseButton).toBe(true);

    await alerts[0].confirmCallback?.event?.();
    await settle();

    expect(api.DELETE_StrategyFrameworkElement).toHaveBeenCalledWith(2);
    expect(panel(1).querySelector('[data-element-id="2"]')).toBeNull();
    expect(document.activeElement).toBe(panel(1).querySelector('[data-testid="edit-row"][data-element-id="1"]'));
  });

  it('returns focus to the delete button when the confirmation is cancelled', async () => {
    await mount(viewOf([element({ id: 1, depth: 1, code: '1', name: 'Area' })]));
    const button = panel(1).querySelector('[data-testid="delete-row"]') as HTMLButtonElement;
    button.click();
    await settle();

    expect(alerts[0].hideCloseButton).toBe(true);
    (document.body as HTMLElement).focus();
    alerts[0].cancelCallback?.event?.();
    expect(document.activeElement).toBe(button);
  });

  it('lists the blocker and the way out, and returns focus to the delete button', async () => {
    api.GET_StrategyFrameworkElementBlockers.mockResolvedValue(
      ok({
        children: 6,
        objectives: 0,
        consumers: [],
        wayOut: ['Delete or move its 6 dimensions first.']
      })
    );
    await mount(viewOf([element({ id: 1, depth: 1, code: '1', name: 'Area', deletable: false })]));
    const button = panel(1).querySelector('[data-testid="delete-row"]') as HTMLButtonElement;
    button.click();
    await settle();

    expect(api.DELETE_StrategyFrameworkElement).not.toHaveBeenCalled();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].summary).toBe('Cannot delete');
    expect(alerts[0].confirmCallback?.label).toBe('Close');
    expect(alerts[0].hasNoCancelButton).toBe(true);
    expect(alerts[0].hideCloseButton).toBe(true);
    expect(alerts[0].detail).toContain('6 children');
    expect(alerts[0].detail).toContain('Delete or move its 6 dimensions first.');

    (document.body as HTMLElement).focus();
    alerts[0].confirmCallback?.event?.();
    expect(document.activeElement).toBe(button);
  });

  it('keeps the newer view when two refreshes resolve out of order', async () => {
    const first = element({ id: 1, depth: 1, code: '1', name: 'Area one' });
    const second = element({ id: 2, depth: 1, code: '2', name: 'Area two' });
    const pending: ((value: MainResponse<FrameworkEditorView>) => void)[] = [];
    api.GET_StrategyFrameworkEditor.mockImplementation(() => new Promise(resolve => pending.push(resolve)));
    await mount(viewOf([first, second]));

    (panel(1).querySelector('[data-testid="delete-row"][data-element-id="2"]') as HTMLButtonElement).click();
    await settle();
    (panel(1).querySelector('[data-testid="delete-row"][data-element-id="1"]') as HTMLButtonElement).click();
    await settle();

    const older = alerts[0].confirmCallback?.event?.();
    for (let i = 0; i < 8 && pending.length < 1; i++) await Promise.resolve();
    const newer = alerts[1].confirmCallback?.event?.();
    for (let i = 0; i < 8 && pending.length < 2; i++) await Promise.resolve();
    expect(pending).toHaveLength(2);

    pending[1](ok(viewOf([])));
    await Promise.resolve();
    pending[0](ok(viewOf([first])));
    await older;
    await newer;
    await settle();

    expect(codes(1)).toEqual([]);
  });
});
