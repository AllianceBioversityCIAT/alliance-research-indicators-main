import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import {
  FrameworkEditorElement,
  FrameworkEditorView,
  FrameworkElement,
  FrameworkElementBlockers,
  FrameworkLevel
} from '@shared/interfaces/strategy-framework.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { GlobalAlert } from '@shared/interfaces/global-alert.interface';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import { OutlineEditorComponent } from './outline-editor.component';

// @akili-spec institutional-performance/strategy-framework T-13 — R-STF-005 scenario, R-STF-006 AC.1,
// R-STF-007 AC.1–AC.3, D-STF-17, D-STF-26. KZ-015: drafts, dirty rows and delete are driven from the DOM.
// KZ-017: jsdom cannot measure indentation, accent visibility or contrast (those are HITL in T-17).

const ok = <T>(data: T): MainResponse<T> =>
  ({ data, status: 200, description: 'ok', timestamp: '', path: '', successfulRequest: true }) as MainResponse<T>;

const LEVELS: FrameworkLevel[] = [
  { id: 1, depth: 1, name: 'Performance Area', pluralName: 'Performance Areas', shortLabel: 'AREA', isIndicatorLevel: false },
  { id: 2, depth: 2, name: 'Dimension', pluralName: 'Dimensions', shortLabel: 'DIMENSION', isIndicatorLevel: false },
  { id: 3, depth: 3, name: 'Indicator', pluralName: 'Indicators', shortLabel: 'INDICATOR', isIndicatorLevel: true }
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

describe('OutlineEditorComponent', () => {
  let fixture: ComponentFixture<OutlineEditorComponent>;
  let api: {
    GET_StrategyFrameworkEditor: jest.Mock;
    POST_StrategyFrameworkElement: jest.Mock;
    PATCH_StrategyFrameworkElement: jest.Mock;
    DELETE_StrategyFrameworkElement: jest.Mock;
    GET_StrategyFrameworkElementBlockers: jest.Mock;
  };
  let alerts: GlobalAlert[];
  let actions: { showGlobalAlert: jest.Mock };

  const root = () => fixture.nativeElement as HTMLElement;
  // A1e refresh is a promise the zone's pending-task tracker does not wait for.
  // One macrotask drains that chain (save continuation, then the GET) before the paint.
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();
  };
  const mount = async (view: FrameworkEditorView, requestRootDraft = false) => {
    fixture = TestBed.createComponent(OutlineEditorComponent);
    fixture.componentRef.setInput('view', view);
    fixture.componentRef.setInput('requestRootDraft', requestRootDraft);
    await settle();
  };
  const rows = () => Array.from(root().querySelectorAll('[data-testid="outline-row"]')) as HTMLElement[];
  const rowByCode = (code: string) =>
    rows().find(row => row.querySelector('[data-testid="code-badge"]')?.textContent?.trim() === code) ?? null;
  const nameOf = (row: HTMLElement) => row.querySelector('[data-testid="name-input"]') as HTMLInputElement;
  const typeInto = async (input: HTMLInputElement, value: string) => {
    input.focus();
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
  };
  const pressEnter = async (input: HTMLInputElement) => {
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await settle();
  };

  beforeEach(async () => {
    alerts = [];
    api = {
      GET_StrategyFrameworkEditor: jest.fn().mockResolvedValue(ok(viewOf([]))),
      POST_StrategyFrameworkElement: jest.fn(),
      PATCH_StrategyFrameworkElement: jest.fn().mockResolvedValue(ok({ id: 1 } as FrameworkElement)),
      DELETE_StrategyFrameworkElement: jest.fn().mockResolvedValue(ok({ id: 1 })),
      GET_StrategyFrameworkElementBlockers: jest.fn().mockResolvedValue(ok(freeBlockers()))
    };
    actions = {
      showGlobalAlert: jest.fn((alert: GlobalAlert) => {
        alerts.push(alert);
      })
    };
    await TestBed.configureTestingModule({
      imports: [OutlineEditorComponent],
      providers: [provideNoopAnimations(), { provide: ApiService, useValue: api }, { provide: ActionsService, useValue: actions }]
    }).compileComponents();
  });

  it('renders four depths from a four-level fixture', async () => {
    const levels: FrameworkLevel[] = [
      ...LEVELS,
      { id: 4, depth: 4, name: 'Sub-indicator', pluralName: 'Sub-indicators', shortLabel: 'SUB', isIndicatorLevel: false }
    ];
    await mount(
      viewOf(
        [
          element({ id: 1, depth: 1, code: '1', name: 'Area' }),
          element({ id: 2, depth: 2, code: '1.1', name: 'Dimension', parentId: 1 }),
          element({ id: 3, depth: 3, code: '1.1.1', name: 'Indicator', parentId: 2 }),
          element({ id: 4, depth: 4, code: '1.1.1.1', name: 'Sub', parentId: 3 })
        ],
        levels
      )
    );

    expect(rows().map(row => row.getAttribute('data-depth'))).toEqual(['1', '2', '3', '4']);
    expect(rowByCode('1.1.1')?.querySelector('[data-testid="level-mark"]')?.tagName).toBe('I');
    expect(rowByCode('1.1.1.1')?.querySelector('[data-testid="level-mark"]')?.textContent?.trim()).toBe('SUB');
    expect(rowByCode('1.1.1')?.querySelector('[data-testid="add-child"]')?.textContent?.trim()).toBe('+ Sub-indicator');
    expect(rowByCode('1.1.1.1')?.querySelector('[data-testid="add-child"]')).toBeNull();
    expect(root().querySelector('[data-testid="outline-nest"]')).not.toBeNull();
    expect(root().querySelectorAll('[data-testid="outline-indent"]').length).toBeGreaterThan(0);
  });

  it('orders codes naturally and rotates the accent tokens', async () => {
    await mount(
      viewOf([
        element({ id: 10, depth: 1, code: '1', name: 'First' }),
        element({ id: 11, depth: 1, code: '2', name: 'Second' }),
        element({ id: 12, depth: 1, code: '3', name: 'Third' }),
        element({ id: 13, depth: 1, code: '4', name: 'Fourth' }),
        element({ id: 14, depth: 1, code: '10', name: 'Tenth' }),
        element({ id: 21, depth: 2, code: '1.10', name: 'Ten', parentId: 10 }),
        element({ id: 22, depth: 2, code: '1.2', name: 'Two', parentId: 10 })
      ])
    );

    const cards = Array.from(root().querySelectorAll('[data-testid="outline-card"]')) as HTMLElement[];
    expect(cards.map(card => card.getAttribute('data-accent'))).toEqual(['1', '2', '3', '4', '1']);
    expect(cards.map(card => card.className)).toEqual([
      'outline-card outline-card--accent-1',
      'outline-card outline-card--accent-2',
      'outline-card outline-card--accent-3',
      'outline-card outline-card--accent-4',
      'outline-card outline-card--accent-1'
    ]);
    const area = rowByCode('1');
    const nested = Array.from(area?.querySelectorAll('[data-testid="code-badge"]') ?? []).map(badge => badge.textContent?.trim());
    expect(nested).toEqual(['1', '1.2', '1.10']);
  });

  it('keeps a dirty row and a draft when a refresh arrives with new server names', async () => {
    const area = element({ id: 1, depth: 1, code: '1', name: 'Area' });
    const dimension = element({ id: 2, depth: 2, code: '1.1', name: 'Dimension', parentId: 1 });
    await mount(viewOf([area, dimension]));

    // Clicking or focusing another field blurs the name and saves it. The refresh-merge
    // case is a row that is still dirty, so these edits are input events without a focus move.
    (rowByCode('1')?.querySelector('[data-testid="add-child"]') as HTMLButtonElement).click();
    await settle();
    const draft = rowByCode('New');
    expect(draft).not.toBeNull();
    const areaInput = nameOf(rowByCode('1') as HTMLElement);
    areaInput.value = 'Dirty area';
    areaInput.dispatchEvent(new Event('input', { bubbles: true }));
    const draftInput = nameOf(draft as HTMLElement);
    draftInput.value = 'Unsaved dimension';
    draftInput.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();

    fixture.componentRef.setInput(
      'view',
      viewOf([
        element({ id: 1, depth: 1, code: '1', name: 'Server area' }),
        element({ id: 2, depth: 2, code: '1.1', name: 'Server dimension', parentId: 1 })
      ])
    );
    await settle();

    expect(nameOf(rowByCode('1') as HTMLElement).value).toBe('Dirty area');
    expect(nameOf(rowByCode('1.1') as HTMLElement).value).toBe('Server dimension');
    expect(nameOf(rowByCode('New') as HTMLElement).value).toBe('Unsaved dimension');
  });

  it('stores a + Dimension draft as the server code 1.7 and sends no code', async () => {
    const area = element({ id: 1, depth: 1, code: '1', name: 'Area' });
    const dimensions = [1, 2, 3, 4, 5, 6].map(n => element({ id: 10 + n, depth: 2, code: `1.${n}`, name: `Dimension ${n}`, parentId: 1 }));
    const created = element({ id: 77, depth: 2, code: '1.7', name: 'Seventh', parentId: 1 });
    api.POST_StrategyFrameworkElement.mockResolvedValue(ok({ id: 77, code: '1.7', name: 'Seventh', depth: 2 } as FrameworkElement));
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok(viewOf([area, ...dimensions, created])));
    await mount(viewOf([area, ...dimensions]));

    (rowByCode('1')?.querySelector('[data-testid="add-child"]') as HTMLButtonElement).click();
    await settle();
    const draftInput = nameOf(rowByCode('New') as HTMLElement);
    expect(document.activeElement).toBe(draftInput);

    await typeInto(draftInput, 'Seventh');
    await pressEnter(draftInput);

    expect(api.POST_StrategyFrameworkElement).toHaveBeenCalledTimes(1);
    const body = api.POST_StrategyFrameworkElement.mock.calls[0][0] as Record<string, unknown>;
    expect(body).not.toHaveProperty('code');
    expect(body).toMatchObject({ portfolioId: 2, parentId: 1, name: 'Seventh' });
    expect(rowByCode('1.7')).not.toBeNull();
    expect(nameOf(rowByCode('1.7') as HTMLElement).value).toBe('Seventh');
  });

  it('stores two drafts as two distinct server codes', async () => {
    const area = element({ id: 1, depth: 1, code: '1', name: 'Area' });
    const first = element({ id: 71, depth: 2, code: '1.7', name: 'First draft', parentId: 1 });
    const second = element({ id: 72, depth: 2, code: '1.8', name: 'Second draft', parentId: 1 });
    api.POST_StrategyFrameworkElement.mockResolvedValueOnce(ok({ id: 71, code: '1.7' } as FrameworkElement)).mockResolvedValueOnce(
      ok({ id: 72, code: '1.8' } as FrameworkElement)
    );
    api.GET_StrategyFrameworkEditor.mockResolvedValueOnce(ok(viewOf([area, first]))).mockResolvedValueOnce(ok(viewOf([area, first, second])));
    await mount(viewOf([area]));

    const add = () => (rowByCode('1')?.querySelector('[data-testid="add-child"]') as HTMLButtonElement).click();
    const news = () => rows().filter(row => row.querySelector('[data-testid="code-badge"]')?.textContent?.trim() === 'New');
    add();
    await settle();
    add();
    await settle();
    expect(news()).toHaveLength(2);

    await typeInto(nameOf(news()[0]), 'First draft');
    await pressEnter(nameOf(news()[0]));
    expect(news()).toHaveLength(1);
    await typeInto(nameOf(news()[0]), 'Second draft');
    await pressEnter(nameOf(news()[0]));

    const bodies = api.POST_StrategyFrameworkElement.mock.calls.map(call => call[0] as Record<string, unknown>);
    expect(bodies).toHaveLength(2);
    expect(bodies.every(body => !Object.prototype.hasOwnProperty.call(body, 'code'))).toBe(true);
    expect(rowByCode('1.7')).not.toBeNull();
    expect(rowByCode('1.8')).not.toBeNull();
  });

  it('removes an unsaved draft on Escape', async () => {
    await mount(viewOf([element({ id: 1, depth: 1, code: '1', name: 'Area' })]));
    (rowByCode('1')?.querySelector('[data-testid="add-child"]') as HTMLButtonElement).click();
    await settle();
    expect(rowByCode('New')).not.toBeNull();

    const input = nameOf(rowByCode('New') as HTMLElement);
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await settle();

    expect(rowByCode('New')).toBeNull();
    expect(api.POST_StrategyFrameworkElement).not.toHaveBeenCalled();
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
    await mount(viewOf([element({ id: 1, depth: 1, code: '1', name: 'Area', deletable: false, blockers: [] })]));
    const button = rowByCode('1')?.querySelector('[data-testid="delete"]') as HTMLButtonElement;
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

  it('confirms a free delete and moves focus to the previous row', async () => {
    const first = element({ id: 1, depth: 1, code: '1', name: 'Area one' });
    const second = element({ id: 2, depth: 1, code: '2', name: 'Area two' });
    api.GET_StrategyFrameworkEditor.mockResolvedValue(ok(viewOf([first])));
    await mount(viewOf([first, second]));

    const button = rowByCode('2')?.querySelector('[data-testid="delete"]') as HTMLButtonElement;
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
    expect(rowByCode('2')).toBeNull();
    expect(document.activeElement).toBe(nameOf(rowByCode('1') as HTMLElement));
  });

  it('returns focus to the delete button when the confirmation is cancelled', async () => {
    await mount(viewOf([element({ id: 1, depth: 1, code: '1', name: 'Area' })]));
    const button = rowByCode('1')?.querySelector('[data-testid="delete"]') as HTMLButtonElement;
    button.click();
    await settle();

    expect(alerts[0].hideCloseButton).toBe(true);
    (document.body as HTMLElement).focus();
    alerts[0].cancelCallback?.event?.();
    expect(document.activeElement).toBe(button);
  });

  it('emits the element id from the details icon', async () => {
    const selected: number[] = [];
    await mount(viewOf([element({ id: 5, depth: 1, code: '1', name: 'Area' })]));
    fixture.componentInstance.detailsRequested.subscribe(id => selected.push(id));

    (rowByCode('1')?.querySelector('[data-testid="details"]') as HTMLButtonElement).click();
    await settle();

    expect(selected).toEqual([5]);
  });

  it('opens a root draft from the empty-state request and labels the add control', async () => {
    await mount(
      viewOf([], [
        { depth: 1, name: 'Performance Area', pluralName: 'Performance Areas', shortLabel: 'AREA', isIndicatorLevel: false, virtual: true }
      ]),
      true
    );

    expect(rowByCode('New')).not.toBeNull();
    expect(document.activeElement).toBe(nameOf(rowByCode('New') as HTMLElement));
    expect(root().querySelector('[data-testid="add-root"]')?.textContent?.trim()).toBe('+ Add Performance Area');
    expect(api.POST_StrategyFrameworkElement).not.toHaveBeenCalled();
  });

  const tree = () =>
    viewOf([
      element({ id: 1, depth: 1, code: '1', name: 'Institutional excellence' }),
      element({ id: 2, depth: 2, code: '1.2', name: 'Financial health', parentId: 1 }),
      element({ id: 3, depth: 3, code: '1.2.3', name: 'Execution and control', parentId: 2 }),
      element({ id: 4, depth: 1, code: '2', name: 'Other area' })
    ]);

  const search = async (term: string) => {
    const input = root().querySelector('[data-testid="outline-search"]') as HTMLInputElement;
    input.value = term;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
  };

  const shown = (code: string) => {
    const row = rowByCode(code);
    return row !== null && !row.hasAttribute('hidden') && row.closest('[hidden]') === null;
  };

  const toggleOf = (code: string) => rowByCode(code)?.querySelector('[data-testid="toggle-children"]') as HTMLButtonElement;

  it('collapses children, keeps that after a refresh, and expands when a child is added', async () => {
    await mount(tree());
    const toggle = toggleOf('1');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Collapse Performance Area 1');
    const nestId = toggle.getAttribute('aria-controls');
    expect(nestId).toBe('outline-children-id-1');
    expect(root().querySelector(`#${nestId}`)?.hasAttribute('hidden')).toBe(false);

    toggle.click();
    await settle();
    expect(toggleOf('1').getAttribute('aria-expanded')).toBe('false');
    expect(toggleOf('1').getAttribute('aria-label')).toBe('Expand Performance Area 1');
    expect(root().querySelector('#outline-children-id-1')?.hasAttribute('hidden')).toBe(true);
    expect(rowByCode('1.2')?.closest('[hidden]')).not.toBeNull();

    const refreshed = tree();
    refreshed.elements = refreshed.elements.map(item => ({ ...item }));
    fixture.componentRef.setInput('view', refreshed);
    await settle();
    expect(toggleOf('1').getAttribute('aria-expanded')).toBe('false');

    (rowByCode('1')?.querySelector('[data-testid="add-child"]') as HTMLButtonElement).click();
    await settle();
    expect(toggleOf('1').getAttribute('aria-expanded')).toBe('true');
    const draft = rowByCode('New');
    expect(draft).not.toBeNull();
    expect(draft?.closest('[hidden]')).toBeNull();
  });

  it('filters by code prefix and by name, keeps ancestors, and says when nothing matches', async () => {
    await mount(tree());
    expect(root().querySelector('label[for="outline-search"]')?.textContent?.trim()).toBe('Find by code or name');

    await search('1.2');
    expect(shown('1')).toBe(true);
    expect(shown('1.2')).toBe(true);
    expect(shown('1.2.3')).toBe(true);
    expect(shown('2')).toBe(false);
    expect(toggleOf('1').getAttribute('aria-expanded')).toBe('true');

    await search('execution');
    expect(shown('1.2.3')).toBe(true);
    expect(shown('1')).toBe(true);
    expect(shown('1.2')).toBe(true);
    expect(shown('2')).toBe(false);

    await search('nomatch');
    expect(root().querySelector('[data-testid="outline-search-empty"]')?.textContent?.trim()).toBe('No elements match "nomatch"');

    const clear = root().querySelector('[data-testid="outline-search-clear"]') as HTMLButtonElement;
    expect(clear.getAttribute('aria-label')).toBe('Clear search');
    expect(clear.textContent?.trim()).toBe('');
    expect(root().querySelectorAll('[data-testid="outline-search-clear"]')).toHaveLength(1);
    expect((root().querySelector('[data-testid="outline-search"]') as HTMLInputElement).type).toBe('text');
    clear.click();
    await settle();
    expect(shown('2')).toBe(true);
    expect(root().querySelector('[data-testid="outline-search-empty"]')).toBeNull();
  });

  it('restores the collapse state when the search is cleared', async () => {
    await mount(tree());
    toggleOf('1').click();
    await settle();
    await search('1.2.3');
    expect(toggleOf('1').getAttribute('aria-expanded')).toBe('true');
    (root().querySelector('[data-testid="outline-search-clear"]') as HTMLButtonElement).click();
    await settle();
    expect(toggleOf('1').getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps a dirty row visible when the search does not match it', async () => {
    await mount(tree());
    const input = nameOf(rowByCode('1.2.3') as HTMLElement);
    await typeInto(input, 'Unsaved working name');
    await search('nomatch-xyz');

    const row = rowByCode('1.2.3');
    expect(row?.hasAttribute('hidden')).toBe(false);
    expect(row?.closest('[hidden]')).toBeNull();
    expect(nameOf(row as HTMLElement).value).toBe('Unsaved working name');
    expect(shown('1')).toBe(true);
    expect(shown('1.2')).toBe(true);
    expect(shown('2')).toBe(false);
  });
});
