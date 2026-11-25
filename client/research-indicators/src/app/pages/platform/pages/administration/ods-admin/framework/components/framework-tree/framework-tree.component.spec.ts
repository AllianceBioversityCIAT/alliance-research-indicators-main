import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FrameworkEditorElement, FrameworkEditorView, FrameworkLevel, FrameworkResponsible } from '@shared/interfaces/strategy-framework.interface';
import { frameworkTreeNodes } from '../../utils/framework-view.util';
import { FrameworkTreeComponent } from './framework-tree.component';

// @akili-spec institutional-performance/strategy-framework T-18 — R-STF-007 AC.1–AC.4,
// NFR-STF-004 (tree keyboard), D-STF-30. KZ-015: collapse, search and **+** are driven from the DOM.
// KZ-017: the accent assertion reads the rendered custom property; the indent assertion reads the
// style value. jsdom cannot judge the painted bar, the 28px step, outline geometry or Tab order (T-22).

const LEVELS: FrameworkLevel[] = [
  { id: 1, depth: 1, name: 'Performance Area', pluralName: 'Performance Areas', shortLabel: 'AREA', isIndicatorLevel: false },
  { id: 2, depth: 2, name: 'Dimension', pluralName: 'Dimensions', shortLabel: 'DIMENSION', isIndicatorLevel: false },
  { id: 3, depth: 3, name: 'Indicator', pluralName: 'Indicators', shortLabel: 'INDICATOR', isIndicatorLevel: true }
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

const view = (): FrameworkEditorView => ({
  portfolioId: 2,
  configured: true,
  levels: LEVELS,
  usageLabels: [],
  elements: [
    element({ id: 1, depth: 1, code: '1', name: 'Institutional excellence' }),
    element({ id: 2, depth: 2, code: '1.10', name: 'Ten', parentId: 1 }),
    element({ id: 3, depth: 2, code: '1.2', name: 'Financial health', parentId: 1 }),
    element({
      id: 4,
      depth: 3,
      code: '1.2.3',
      name: 'Execution and control',
      parentId: 3,
      responsibles
    }),
    element({ id: 5, depth: 1, code: '2', name: 'Other area' }),
    element({ id: 6, depth: 2, code: '2.1', name: 'Second dimension', parentId: 5 }),
    element({ id: 7, depth: 1, code: '3', name: 'Third area' }),
    element({ id: 8, depth: 1, code: '4', name: 'Fourth area' }),
    element({ id: 9, depth: 1, code: '10', name: 'Tenth area' }),
    element({ id: 10, depth: 2, code: '10.1', name: 'Under ten', parentId: 9 })
  ]
});

describe('FrameworkTreeComponent', () => {
  let fixture: ComponentFixture<FrameworkTreeComponent>;

  const root = () => fixture.nativeElement as HTMLElement;
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const rows = () => Array.from(root().querySelectorAll('[data-testid="framework-tree-row"]')) as HTMLElement[];
  const rowByCode = (code: string) =>
    rows().find(row => row.querySelector('[data-testid="framework-tree-code"]')?.textContent?.trim() === code) ?? null;
  const codes = () => rows().map(row => row.querySelector('[data-testid="framework-tree-code"]')?.textContent?.trim());
  const toggleOf = (code: string) => rowByCode(code)?.querySelector('[data-testid="framework-tree-toggle"]') as HTMLButtonElement;
  const accentOf = (code: string) => rowByCode(code)?.style.getPropertyValue('--row-accent').trim() ?? '';
  const indentOf = (code: string) => (rowByCode(code)?.querySelector('[data-testid="framework-tree-indent"]') as HTMLElement).style.paddingLeft;
  const addOf = (code: string) => rowByCode(code)?.querySelector('[data-testid="framework-tree-add"]') as HTMLButtonElement | null;
  const search = async (term: string) => {
    const input = root().querySelector('[data-testid="framework-tree-search"]') as HTMLInputElement;
    input.value = term;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FrameworkTreeComponent],
      providers: [provideNoopAnimations()]
    }).compileComponents();
    fixture = TestBed.createComponent(FrameworkTreeComponent);
    fixture.componentRef.setInput('nodes', frameworkTreeNodes(view()));
    fixture.componentRef.setInput('selectedId', null);
    await settle();
  });

  it('renders natural code order, read-only names, counts and level text', () => {
    expect(codes()).toEqual(['1', '1.2', '1.2.3', '1.10', '2', '2.1', '3', '4', '10', '10.1']);
    expect(codes().indexOf('1.2')).toBeLessThan(codes().indexOf('1.10'));

    const area = rowByCode('1');
    expect(area?.querySelector('[data-testid="framework-tree-name"]')?.tagName).toBe('SPAN');
    expect(area?.querySelector('[data-testid="framework-tree-name"]')?.textContent?.trim()).toBe('Institutional excellence');
    expect(area?.querySelector('[data-testid="framework-tree-counts"]')?.textContent?.trim()).toBe('2 dimensions · 1 indicator');
    expect(area?.querySelector('[data-testid="framework-tree-level"]')?.textContent?.trim()).toBe('Performance Area');
    expect(rowByCode('1.2')?.querySelector('[data-testid="framework-tree-counts"]')?.textContent?.trim()).toBe('1 indicator');
    expect(rowByCode('1.2.3')?.querySelector('[data-testid="framework-tree-level"]')?.textContent?.trim()).toBe('Indicator');
    expect(rowByCode('1.2.3')?.querySelector('[data-testid="framework-tree-responsibles"]')?.textContent?.trim()).toBe(
      'Idris Jones; Philippe Attey (inactive)'
    );
    expect(rowByCode('1.2')?.querySelector('[data-testid="framework-tree-responsibles"]')?.textContent?.trim()).toBe('');

    const table = root().querySelector('[data-testid="framework-tree"]') as HTMLElement;
    expect(table.querySelectorAll('input, textarea')).toHaveLength(0);
    const nameHeader = root().querySelector('[data-testid="framework-tree-name-header"]') as HTMLElement;
    expect(nameHeader.style.width).toBe('50%');
    expect(root().querySelector('[data-testid="framework-tree-name-header"] + th + th + th + th .sr-only')?.textContent?.trim()).toBe('Add');
    expect(rowByCode('1')?.querySelector('[data-testid="framework-tree-add"]')?.textContent?.trim()).toBe('+ Dimension');
    expect(rowByCode('1.2')?.querySelector('[data-testid="framework-tree-add"]')?.getAttribute('aria-label')).toBe('Add Indicator under 1.2');
    expect(rowByCode('1.2.3')?.querySelector('[data-testid="framework-tree-add"]')).toBeNull();
  });

  it('keeps the toggle and the name together so a leaf cannot start under the chevron', () => {
    const leaf = rowByCode('1.2.3') as HTMLElement;
    const identity = leaf.querySelector('[data-testid="framework-tree-identity"]') as HTMLElement;
    expect(identity.querySelector('[data-testid="framework-tree-toggle"]')).not.toBeNull();
    expect(identity.querySelector('[data-testid="framework-tree-name"]')).not.toBeNull();
    expect(identity.querySelector('[data-testid="framework-tree-counts"]')).toBeNull();

    const area = rowByCode('1') as HTMLElement;
    const areaIdentity = area.querySelector('[data-testid="framework-tree-identity"]') as HTMLElement;
    const counts = area.querySelector('[data-testid="framework-tree-counts"]') as HTMLElement;
    expect(areaIdentity.contains(area.querySelector('[data-testid="framework-tree-name"]'))).toBe(true);
    expect(areaIdentity.contains(counts)).toBe(false);
    expect(area.querySelector('[data-testid="framework-tree-indent"]')?.contains(counts)).toBe(true);
    expect(leaf.querySelector('[data-testid="framework-tree-indent"]')?.contains(identity)).toBe(true);
  });

  it('puts only the active row add button in the tab order', async () => {
    const tabbable = () =>
      Array.from(root().querySelectorAll('[data-testid="framework-tree-add"]')).filter(button => button.getAttribute('tabindex') === '0');
    expect(addOf('1')?.getAttribute('tabindex')).toBe('0');
    expect(addOf('1.2')?.getAttribute('tabindex')).toBe('-1');
    expect(tabbable()).toHaveLength(1);

    (rowByCode('1') as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }));
    await settle();
    expect(addOf('1')?.getAttribute('tabindex')).toBe('-1');
    expect(addOf('1.2')?.getAttribute('tabindex')).toBe('0');
    expect(tabbable()).toHaveLength(1);

    (rowByCode('2') as HTMLElement).click();
    await settle();
    expect(addOf('2')?.getAttribute('tabindex')).toBe('0');
    expect(addOf('1.2')?.getAttribute('tabindex')).toBe('-1');
    expect(tabbable()).toHaveLength(1);
  });

  it('indents by level and paints each descendant with its area accent', () => {
    expect(indentOf('1')).toBe('0px');
    expect(indentOf('1.2')).toBe('28px');
    expect(indentOf('1.2.3')).toBe('56px');

    expect(accentOf('1')).toBe('var(--ac-framework-accent-1)');
    expect(accentOf('1.2')).toBe(accentOf('1'));
    expect(accentOf('1.2.3')).toBe(accentOf('1'));
    expect(accentOf('1.10')).toBe(accentOf('1'));
    expect(accentOf('2')).toBe('var(--ac-framework-accent-2)');
    expect(accentOf('2.1')).toBe(accentOf('2'));
    expect(accentOf('10')).toBe('var(--ac-framework-accent-1)');
    expect(accentOf('10.1')).toBe(accentOf('10'));
    expect(accentOf('2')).not.toBe(accentOf('1'));
  });

  it('selects from a name click and from Enter or Space on the row', async () => {
    const selected: number[] = [];
    fixture.componentInstance.elementSelected.subscribe(id => selected.push(id));
    const row = rowByCode('1.2') as HTMLElement;
    (row.querySelector('[data-testid="framework-tree-name"]') as HTMLElement).click();
    row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    row.dispatchEvent(space);

    expect(selected).toEqual([3, 3, 3]);
    expect(space.defaultPrevented).toBe(true);

    fixture.componentRef.setInput('selectedId', 3);
    await settle();
    expect(row.getAttribute('aria-selected')).toBe('true');
    expect(row.getAttribute('data-p-highlight')).toBe('true');
    expect(row.classList.contains('framework-tree__row--selected')).toBe(true);
    expect(rowByCode('1')?.getAttribute('aria-selected')).toBe('false');
    expect(rowByCode('1')?.hasAttribute('data-p-highlight')).toBe(false);
    expect(row.hasAttribute('tabindex')).toBe(true);
  });

  it('Enter on + requests a child, selects nothing, and adds no row', async () => {
    const selected: number[] = [];
    const children: number[] = [];
    fixture.componentInstance.elementSelected.subscribe(id => selected.push(id));
    fixture.componentInstance.childRequested.subscribe(id => children.push(id));
    const before = codes();
    const add = rowByCode('1')?.querySelector('[data-testid="framework-tree-add"]') as HTMLButtonElement;
    add.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await settle();

    expect(children).toEqual([1]);
    expect(selected).toEqual([]);
    expect(codes()).toEqual(before);
  });

  it('clicking + requests a child and does not select the row', () => {
    const selected: number[] = [];
    const children: number[] = [];
    fixture.componentInstance.elementSelected.subscribe(id => selected.push(id));
    fixture.componentInstance.childRequested.subscribe(id => children.push(id));
    (rowByCode('1')?.querySelector('[data-testid="framework-tree-add"]') as HTMLButtonElement).click();
    expect(children).toEqual([1]);
    expect(selected).toEqual([]);
  });

  it('collapses from the chevron and hides descendants', async () => {
    const emitted: ReadonlySet<number>[] = [];
    fixture.componentInstance.expansionChanged.subscribe(set => emitted.push(set));
    const toggle = toggleOf('1');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Collapse Performance Area 1');
    expect(toggle.getAttribute('tabindex')).toBe('-1');

    toggle.click();
    await settle();

    expect(emitted[0]?.has(1)).toBe(true);
    expect(toggleOf('1').getAttribute('aria-expanded')).toBe('false');
    expect(toggleOf('1').getAttribute('aria-label')).toBe('Expand Performance Area 1');
    expect(rowByCode('1.2')).toBeNull();
    expect(rowByCode('1.10')).toBeNull();
    expect(rowByCode('1.2.3')).toBeNull();
    expect(rowByCode('2')).not.toBeNull();
  });

  it('filters by code prefix and by name, keeps ancestors, and says when nothing matches', async () => {
    expect(root().querySelector('label[for="framework-tree-search"]')?.textContent?.trim()).toBe('Find by code or name');

    await search('1.2');
    expect(codes()).toEqual(['1', '1.2', '1.2.3']);
    expect(toggleOf('1').getAttribute('aria-expanded')).toBe('true');

    await search('execution');
    expect(codes()).toEqual(['1', '1.2', '1.2.3']);

    await search('nomatch');
    expect(root().querySelector('[data-testid="framework-tree-search-empty"]')?.textContent?.trim()).toBe('No elements match "nomatch"');
    expect(codes()).toEqual([]);

    const clear = root().querySelector('[data-testid="framework-tree-search-clear"]') as HTMLButtonElement;
    expect(clear.getAttribute('aria-label')).toBe('Clear search');
    expect(clear.textContent?.trim()).toBe('');
    clear.click();
    await settle();
    expect(codes()).toContain('2');
    expect(codes()).toContain('1.10');
    expect(root().querySelector('[data-testid="framework-tree-search-empty"]')).toBeNull();
  });

  it('keeps ArrowLeft and ArrowRight in the collapsed set across a refresh', async () => {
    const emitted: ReadonlySet<number>[] = [];
    fixture.componentInstance.expansionChanged.subscribe(set => emitted.push(set));

    (rowByCode('1') as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', bubbles: true }));
    await settle();

    expect(emitted.at(-1)?.has(1)).toBe(true);
    expect(toggleOf('1').getAttribute('aria-label')).toBe('Expand Performance Area 1');

    fixture.componentRef.setInput('nodes', frameworkTreeNodes(view()));
    await settle();
    expect(rowByCode('1.2')).toBeNull();

    toggleOf('1').click();
    await settle();
    expect(rowByCode('1.2')).not.toBeNull();
    expect(emitted.at(-1)?.has(1)).toBe(false);

    (rowByCode('1') as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', bubbles: true }));
    await settle();
    await search('1.2');
    (root().querySelector('[data-testid="framework-tree-search-clear"]') as HTMLButtonElement).click();
    await settle();
    expect(rowByCode('1.2')).toBeNull();

    (rowByCode('1') as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', bubbles: true }));
    await settle();
    expect(emitted.at(-1)?.has(1)).toBe(false);
    expect(rowByCode('1.2')).not.toBeNull();
  });

  it('restores the collapse set when the search is cleared', async () => {
    toggleOf('1').click();
    await settle();
    await search('1.2.3');
    expect(toggleOf('1').getAttribute('aria-expanded')).toBe('true');
    expect(rowByCode('1.2.3')).not.toBeNull();

    (root().querySelector('[data-testid="framework-tree-search-clear"]') as HTMLButtonElement).click();
    await settle();
    expect(toggleOf('1').getAttribute('aria-expanded')).toBe('false');
    expect(rowByCode('1.2')).toBeNull();
    expect(rowByCode('2')).not.toBeNull();
  });
});
