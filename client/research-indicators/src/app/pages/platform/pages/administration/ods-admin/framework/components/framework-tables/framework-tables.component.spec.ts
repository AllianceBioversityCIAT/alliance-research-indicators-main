import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FrameworkEditorElement, FrameworkEditorView, FrameworkLevel, FrameworkResponsible } from '@shared/interfaces/strategy-framework.interface';
import { FrameworkTablesComponent } from './framework-tables.component';

// @akili-spec institutional-performance/strategy-framework T-23 — R-STF-008 AC.1, design §6.4, D-STF-37.
// KZ-001: columns and the selected row are read from the DOM.
// KZ-015: the row is clicked and Enter/Space are dispatched on it.
// Count chips live on the page band (D-STF-45). This table renders none.
// KZ-017: jsdom cannot judge the card, the toolbar or column alignment.

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

const viewOf = (elements: FrameworkEditorElement[], levels: FrameworkLevel[] = LEVELS, portfolioId = 2): FrameworkEditorView => ({
  portfolioId,
  configured: elements.length > 0,
  levels,
  elements,
  usageLabels: []
});

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

/** 4 areas, 13 dimensions, 31 indicators. Same shape as the seed counts. */
const seed48 = (): FrameworkEditorView => {
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
  return viewOf(elements);
};

describe('FrameworkTablesComponent', () => {
  let fixture: ComponentFixture<FrameworkTablesComponent>;

  const root = () => fixture.nativeElement as HTMLElement;
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();
  };
  const mount = async (view: FrameworkEditorView) => {
    fixture = TestBed.createComponent(FrameworkTablesComponent);
    fixture.componentRef.setInput('view', view);
    fixture.componentRef.setInput('selectedKey', null);
    await settle();
  };
  const headers = () => Array.from(root().querySelectorAll('th')).map(cell => cell.textContent?.replace(/\s+/g, ' ').trim());
  const codes = () => Array.from(root().querySelectorAll('[data-testid="cell-code"]')).map(cell => cell.textContent?.trim());
  const row = (key: string) => root().querySelector(`[data-testid="data-table-row"][data-row-key="${key}"]`) as HTMLElement;
  const search = async (term: string) => {
    fixture.componentRef.setInput('queryOverride', term);
    await settle();
  };
  const showAll = async () => {
    const paginator = fixture.debugElement.query(By.css('p-paginator')).componentInstance as {
      rows: number;
      changePage: (page: number) => void;
    };
    paginator.rows = 100;
    paginator.changePage(0);
    await settle();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FrameworkTablesComponent],
      providers: [provideNoopAnimations()]
    }).compileComponents();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders no count chips of its own', async () => {
    await mount(fourLevelView());

    expect(root().querySelector('[data-testid="level-chips"]')).toBeNull();
    expect(root().querySelector('[data-testid="count-chips"]')).toBeNull();
    expect(root().querySelector('[data-testid="count-chip"]')).toBeNull();
    expect(root().querySelector('[data-testid="level-chip"]')).toBeNull();
    expect(root().querySelector('.level-chip')).toBeNull();
    expect(root().querySelectorAll('app-data-table')).toHaveLength(1);
  });

  it('renders 48 rows from every level in one table', async () => {
    await mount(seed48());
    await showAll();

    const levels = Array.from(root().querySelectorAll('[data-testid="cell-levelName"]')).map(cell => cell.textContent?.trim());
    expect(root().querySelectorAll('[data-testid="data-table-row"]')).toHaveLength(48);
    expect(levels.filter(name => name === 'Performance Area')).toHaveLength(4);
    expect(levels.filter(name => name === 'Dimension')).toHaveLength(13);
    expect(levels.filter(name => name === 'Indicator')).toHaveLength(31);
    expect(row('1').querySelector('[data-testid="cell-parentLabel"]')?.textContent?.trim()).toBe('');
    expect(row('101').querySelector('[data-testid="cell-parentLabel"]')?.textContent?.trim()).toBe('1 · Area 1');
    expect(row('1001').querySelector('[data-testid="cell-parentLabel"]')?.textContent?.trim()).toBe('1.1 · Dimension 1');
    expect(row('1001').querySelector('[data-testid="cell-responsiblesText"]')?.textContent?.trim()).toBe('');
  });

  it('shows Level and Parent for every depth, and marks an inactive responsible', async () => {
    await mount(fourLevelView());

    expect(headers()).toEqual(['Code', 'Level', 'Name', 'Parent', 'Responsibles']);
    expect(codes()).toEqual(['1', '1.1', '1.1.1', '1.1.1.1']);
    expect(row('1').querySelector('[data-testid="cell-levelName"]')?.textContent?.trim()).toBe('Performance Area');
    expect(row('1').querySelector('[data-testid="cell-parentLabel"]')?.textContent?.trim()).toBe('');
    expect(row('2').querySelector('[data-testid="cell-levelName"]')?.textContent?.trim()).toBe('Dimension');
    expect(row('2').querySelector('[data-testid="cell-parentLabel"]')?.textContent?.trim()).toBe('1 · Area');
    expect(row('3').querySelector('[data-testid="cell-levelName"]')?.textContent?.trim()).toBe('Indicator');
    expect(row('3').querySelector('[data-testid="cell-parentLabel"]')?.textContent?.trim()).toBe('1.1 · Dimension');
    expect(row('3').querySelector('[data-testid="cell-responsiblesText"]')?.textContent?.trim()).toBe('Idris Jones; Philippe Attey (inactive)');
    expect(row('4').querySelector('[data-testid="cell-levelName"]')?.textContent?.trim()).toBe('Sub-indicator');
    expect(row('4').querySelector('[data-testid="cell-parentLabel"]')?.textContent?.trim()).toBe('1.1.1 · Indicator');
    expect(row('4').querySelector('[data-testid="cell-responsiblesText"]')?.textContent?.trim()).toBe('');
    expect(root().querySelector('[data-testid="column-header-actions"]')).toBeNull();
    expect(root().querySelector('[data-testid="add-level"]')).toBeNull();
    expect(root().textContent).not.toContain('+ Sub-indicator');
    expect(root().textContent).not.toContain('+ Performance Area');
  });

  it('sorts by code naturally, pages 10 rows, and filters by code and by name', async () => {
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

    const naturalFirstPage = ['1', '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9'];
    expect(codes()).toEqual(naturalFirstPage);
    expect(root().querySelectorAll('[data-testid="data-table-row"]')).toHaveLength(10);

    const paginator = fixture.debugElement.query(By.css('p-paginator')).componentInstance as {
      rows: number;
      rowsPerPageOptions: number[];
      changePage: (page: number) => void;
    };
    expect(root().querySelector('.p-paginator-rpp-dropdown')).not.toBeNull();
    expect(paginator.rowsPerPageOptions).toEqual([10, 25, 50, 100]);
    paginator.rows = 25;
    paginator.changePage(0);
    await settle();
    expect(codes()).toEqual(['1', '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '1.10', '1.11', '1.12']);

    paginator.rows = 10;
    paginator.changePage(0);
    await settle();

    fixture.componentRef.setInput('selectedKey', '1');
    await settle();
    expect(row('1').getAttribute('aria-selected')).toBe('true');
    const selected: number[] = [];
    fixture.componentInstance.rowSelected.subscribe(id => selected.push(id));

    await search('Ten');
    expect(codes()).toEqual(['1.10']);
    expect(row('1')).toBeNull();
    expect(selected).toEqual([]);

    await search('');
    expect(row('1').getAttribute('aria-selected')).toBe('true');

    await search('1.12');
    expect(codes()).toEqual(['1.12']);
    expect(root().querySelector('[data-testid="data-table-search"]')).toBeNull();
    expect(root().querySelector('[data-testid="data-table-export"]')).toBeNull();
    expect(root().querySelector('[data-testid="count-chip"]')).toBeNull();
  });

  it('says nothing matches instead of the true-empty message, then restores the rows', async () => {
    await mount(fourLevelView());
    const before = codes();

    await search('zzz');

    expect(root().querySelector('[data-testid="framework-table-search-empty"]')?.textContent?.trim()).toBe('No elements match "zzz"');
    expect(root().querySelector('[data-testid="framework-table-search-empty"]')?.getAttribute('role')).toBe('status');
    expect(root().querySelector('[data-testid="data-table-empty"]')).toBeNull();
    expect(root().textContent).not.toContain('No elements yet.');

    await search('');

    expect(codes()).toEqual(before);
    expect(root().querySelector('[data-testid="framework-table-search-empty"]')).toBeNull();
  });

  it('shows the true-empty message when a query is typed over no elements', async () => {
    await mount(viewOf([]));

    await search('zzz');

    expect(root().querySelector('[data-testid="data-table-empty"]')?.textContent?.trim()).toBe('No elements yet.');
    expect(root().querySelector('[data-testid="framework-table-search-empty"]')).toBeNull();
  });

  it('selects a row from click, Enter and Space, and highlights the string selectedKey', async () => {
    const selected: number[] = [];
    await mount(fourLevelView());
    fixture.componentInstance.rowSelected.subscribe(id => selected.push(id));

    const area = row('1');
    expect(area.getAttribute('tabindex')).toBe('0');
    area.click();
    row('2').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    row('3').dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await settle();

    expect(selected).toEqual([1, 2, 3]);
    expect(root().querySelector('[data-testid="edit-row"]')).toBeNull();
    expect(root().querySelector('[data-testid="delete-row"]')).toBeNull();

    fixture.componentRef.setInput('selectedKey', '1');
    await settle();
    expect(row('1').getAttribute('aria-selected')).toBe('true');
    expect(row('2').getAttribute('aria-selected')).toBe('false');
  });
});
