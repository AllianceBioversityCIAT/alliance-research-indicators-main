import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { FrameworkEditorElement, FrameworkElement, FrameworkLevel } from '@shared/interfaces/strategy-framework.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ApiService } from '@shared/services/api.service';
import { OutlineNode } from '../outline-node.model';
import { OutlineRowComponent } from './outline-row.component';

// @akili-spec institutional-performance/strategy-framework T-13 — R-STF-007 AC.2, R-STF-006 AC.1 (icon),
// NFR-STF-004. KZ-015: the phase is reached by input, keydown and blur, never by setting the signal.
// KZ-017: jsdom cannot measure indentation, accent visibility or contrast (T-17).

const ok = <T>(data: T): MainResponse<T> =>
  ({ data, status: 200, description: 'ok', timestamp: '', path: '', successfulRequest: true }) as MainResponse<T>;

const LEVELS: FrameworkLevel[] = [
  { id: 1, depth: 1, name: 'Performance Area', pluralName: 'Performance Areas', shortLabel: 'AREA', isIndicatorLevel: false },
  { id: 2, depth: 2, name: 'Dimension', pluralName: 'Dimensions', shortLabel: 'DIMENSION', isIndicatorLevel: false },
  { id: 3, depth: 3, name: 'Indicator', pluralName: 'Indicators', shortLabel: 'INDICATOR', isIndicatorLevel: true }
];

const element = (partial: Partial<FrameworkEditorElement> & Pick<FrameworkEditorElement, 'id' | 'code' | 'name'>): FrameworkEditorElement => ({
  levelId: 1,
  depth: 1,
  description: null,
  parentId: null,
  descendantCounts: {},
  usage: {},
  deletable: true,
  blockers: [],
  ...partial
});

const storedNode = (item: FrameworkEditorElement, counts: Record<number, number> = {}): OutlineNode => ({
  key: `id:${item.id}`,
  element: item,
  draft: null,
  counts,
  children: []
});

describe('OutlineRowComponent', () => {
  let fixture: ComponentFixture<OutlineRowComponent>;
  let api: { PATCH_StrategyFrameworkElement: jest.Mock; POST_StrategyFrameworkElement: jest.Mock };

  const root = () => fixture.nativeElement as HTMLElement;
  const nameInput = () => root().querySelector('[data-testid="name-input"]') as HTMLInputElement;
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const mount = async (node: OutlineNode) => {
    fixture = TestBed.createComponent(OutlineRowComponent);
    fixture.componentRef.setInput('node', node);
    fixture.componentRef.setInput('levels', LEVELS);
    fixture.componentRef.setInput('usageLabels', []);
    fixture.componentRef.setInput('portfolioId', 2);
    await settle();
  };
  const typeInto = async (value: string) => {
    const input = nameInput();
    input.focus();
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();
  };
  const key = (input: HTMLInputElement, name: string) => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
  };

  beforeEach(async () => {
    api = {
      PATCH_StrategyFrameworkElement: jest.fn().mockResolvedValue(ok({ id: 1 } as FrameworkElement)),
      POST_StrategyFrameworkElement: jest.fn().mockResolvedValue(ok({ id: 9, code: '1.7' } as FrameworkElement))
    };
    await TestBed.configureTestingModule({
      imports: [OutlineRowComponent],
      providers: [provideNoopAnimations(), { provide: ApiService, useValue: api }]
    }).compileComponents();
  });

  it('saves once on Enter, and the blur that follows does not send again', async () => {
    await mount(storedNode(element({ id: 1, code: '1', name: 'Area' })));
    await typeInto('Renamed area');

    const input = nameInput();
    input.focus();
    key(input, 'Enter');
    await settle();

    expect(api.PATCH_StrategyFrameworkElement).toHaveBeenCalledTimes(1);
    expect(api.PATCH_StrategyFrameworkElement).toHaveBeenCalledWith(1, { name: 'Renamed area' });
  });

  it('saves on blur when Enter was not pressed', async () => {
    await mount(storedNode(element({ id: 1, code: '1', name: 'Area' })));
    await typeInto('From blur');

    nameInput().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    await settle();

    expect(api.PATCH_StrategyFrameworkElement).toHaveBeenCalledTimes(1);
    expect(api.PATCH_StrategyFrameworkElement).toHaveBeenCalledWith(1, { name: 'From blur' });
  });

  it('keeps the field read-only while the save is in flight, so Escape cannot resend', async () => {
    let resolvePatch: (value: MainResponse<FrameworkElement>) => void = () => undefined;
    api.PATCH_StrategyFrameworkElement.mockReturnValue(new Promise(resolve => (resolvePatch = resolve)));
    await mount(storedNode(element({ id: 1, code: '1', name: 'Area' })));
    await typeInto('Pending');

    const input = nameInput();
    input.focus();
    key(input, 'Enter');
    await settle();

    expect(input.readOnly).toBe(true);
    expect(root().querySelector('[data-testid="details"]')?.hasAttribute('disabled')).toBe(true);
    expect(root().querySelector('[data-testid="delete"]')?.hasAttribute('disabled')).toBe(true);

    key(input, 'Escape');
    input.value = 'Typed during save';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle();

    expect(input.value).toBe('Pending');
    expect(api.PATCH_StrategyFrameworkElement).toHaveBeenCalledTimes(1);

    resolvePatch(ok({ id: 1, code: '1', name: 'Pending', depth: 1 } as FrameworkElement));
    await settle();
    expect(input.readOnly).toBe(false);
  });

  it('restores the stored name on Escape and sends nothing', async () => {
    await mount(storedNode(element({ id: 1, code: '1', name: 'Area' })));
    await typeInto('Not saved');

    const input = nameInput();
    key(input, 'Escape');
    await settle();

    expect(input.value).toBe('Area');
    expect(api.PATCH_StrategyFrameworkElement).not.toHaveBeenCalled();
  });

  it('keeps the typed value and shows the message when the save fails', async () => {
    api.PATCH_StrategyFrameworkElement.mockResolvedValue({
      data: undefined,
      status: 409,
      description: 'error',
      timestamp: '',
      path: '',
      successfulRequest: false,
      errorDetail: { description: 'ConflictException', errors: { description: 'code is taken', field: 'code' } }
    });
    await mount(storedNode(element({ id: 1, code: '1', name: 'Area' })));
    await typeInto('Kept');

    nameInput().dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    await settle();

    expect(nameInput().value).toBe('Kept');
    expect(root().querySelector('[data-testid="name-error"]')?.textContent?.trim()).toBe('code is taken');
    expect(nameInput().readOnly).toBe(false);
  });

  it('rejects an empty name without a request', async () => {
    await mount(storedNode(element({ id: 1, code: '1', name: 'Area' })));
    await typeInto('   ');

    const input = nameInput();
    input.focus();
    key(input, 'Enter');
    await settle();

    expect(api.PATCH_StrategyFrameworkElement).not.toHaveBeenCalled();
    expect(root().querySelector('[data-testid="name-error"]')?.textContent?.trim()).toBe('Name is required');
    expect(input.value).toBe('   ');
  });

  it('shows New on a draft, sends no code, and Escape removes the draft', async () => {
    const discarded: string[] = [];
    await mount({
      key: 'draft:d1',
      element: null,
      draft: { key: 'd1', parentId: 1, depth: 2, autofocus: false },
      counts: {},
      children: []
    });
    fixture.componentInstance.discardDraft.subscribe(keyName => discarded.push(keyName));

    expect(root().querySelector('[data-testid="code-badge"]')?.textContent?.trim()).toBe('New');
    expect(root().querySelector('[data-testid="level-mark"]')?.textContent?.trim()).toBe('DIMENSION');

    await typeInto('New dimension');
    const input = nameInput();
    input.focus();
    key(input, 'Enter');
    await settle();

    expect(api.POST_StrategyFrameworkElement).toHaveBeenCalledTimes(1);
    const body = api.POST_StrategyFrameworkElement.mock.calls[0][0] as Record<string, unknown>;
    expect(body).toEqual({ portfolioId: 2, parentId: 1, name: 'New dimension' });
    expect(body).not.toHaveProperty('code');

    await typeInto('Will discard');
    key(nameInput(), 'Escape');
    await settle();
    expect(discarded).toEqual(['d1']);
  });

  it('labels the field and the icon buttons, and caps the name at 255', async () => {
    await mount(storedNode(element({ id: 4, depth: 2, code: '1.2', name: 'Dimension' })));

    expect(nameInput().getAttribute('aria-label')).toBe('Dimension 1.2 name');
    expect(nameInput().getAttribute('maxlength')).toBe('255');
    expect(root().querySelector('[data-testid="details"]')?.getAttribute('aria-label')).toBe('Edit details of Dimension 1.2');
    expect(root().querySelector('[data-testid="delete"]')?.getAttribute('aria-label')).toBe('Delete Dimension 1.2');
    expect(root().querySelector('[data-testid="add-child"]')?.textContent?.trim()).toBe('+ Indicator');
  });

  it('paints the delete icon from deletable and names the blocker when it is not', async () => {
    await mount(storedNode(element({ id: 1, code: '1', name: 'Area' })));
    const ready = root().querySelector('[data-testid="delete"]') as HTMLButtonElement;
    expect(ready.classList.contains('outline-row__delete--ready')).toBe(true);
    expect(ready.classList.contains('outline-row__delete--blocked')).toBe(false);
    expect(ready.getAttribute('aria-disabled')).toBe('false');
    expect(ready.getAttribute('aria-describedby')).toBeNull();

    fixture.componentRef.setInput(
      'node',
      storedNode(
        element({
          id: 1,
          code: '1',
          name: 'Area',
          deletable: false,
          blockers: [{ reason: 'children', count: 6, wayOut: 'Delete or move its 6 dimensions first.' }]
        })
      )
    );
    await settle();

    const blocked = root().querySelector('[data-testid="delete"]') as HTMLButtonElement;
    expect(blocked.classList.contains('outline-row__delete--blocked')).toBe(true);
    expect(blocked.classList.contains('outline-row__delete--ready')).toBe(false);
    expect(blocked.getAttribute('aria-disabled')).toBe('true');
    expect(blocked.hasAttribute('disabled')).toBe(false);
    const described = root().querySelector(`#${blocked.getAttribute('aria-describedby')}`);
    expect(described?.textContent?.trim()).toBe('Delete or move its 6 dimensions first.');
  });

  it('shows an arrow on the indicator level and the usage count beside the name', async () => {
    await mount(storedNode(element({ id: 8, depth: 3, levelId: 3, code: '1.1.2', name: 'Uptake', parentId: 2, usage: { kpis: 46 } })));
    fixture.componentRef.setInput('usageLabels', [{ consumerName: 'kpis', label: 'KPIs' }]);
    await settle();

    const mark = root().querySelector('[data-testid="level-mark"]') as HTMLElement;
    expect(mark.tagName).toBe('I');
    expect(mark.getAttribute('aria-hidden')).toBe('true');
    expect(root().querySelector('[data-testid="add-child"]')).toBeNull();
    expect(root().querySelector('[data-testid="counts"]')?.textContent?.trim()).toBe('46 KPIs');
  });
});
