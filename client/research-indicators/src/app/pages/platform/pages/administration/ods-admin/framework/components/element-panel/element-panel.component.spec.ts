import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Select } from 'primeng/select';
import { FrameworkEditorElement, FrameworkEditorView, FrameworkLevel } from '@shared/interfaces/strategy-framework.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import { ElementPanelComponent } from './element-panel.component';

// @akili-spec institutional-performance/strategy-framework T-19 — R-STF-016, §6.5, D-STF-29, D-STF-33.
// The form is in the panel, not a drawer. KZ-015: fields are typed and buttons are clicked.
// jsdom cannot prove focus order or the panel's scroll (KZ-017).

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

const LEVELS: FrameworkLevel[] = [
  { id: 1, depth: 1, name: 'Performance Area', pluralName: 'Performance Areas', shortLabel: 'AREA', isIndicatorLevel: false },
  { id: 2, depth: 2, name: 'Dimension', pluralName: 'Dimensions', shortLabel: 'DIMENSION', isIndicatorLevel: false },
  { id: 3, depth: 3, name: 'Indicator', pluralName: 'Indicators', shortLabel: 'INDICATOR', isIndicatorLevel: true }
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

const VIEW: FrameworkEditorView = {
  portfolioId: 2,
  configured: true,
  levels: LEVELS,
  usageLabels: [],
  elements: [
    element({ id: 1, depth: 1, code: '1', name: 'Area one' }),
    element({ id: 2, depth: 1, code: '2', name: 'Area two' }),
    element({ id: 20, depth: 2, code: '1.1', name: 'Dimension one', parentId: 1 }),
    element({ id: 21, depth: 2, code: '1.2', name: 'Dimension two', parentId: 1 }),
    element({
      id: 31,
      depth: 3,
      code: '1.1.1',
      name: 'Process efficiency',
      parentId: 20,
      responsibles: [
        { carnet: 'IJ', name: 'Idris Jones', email: 'ij@alliance.org', isActiveStaff: true },
        { carnet: 'PA', name: 'Philippe Attey', email: 'pa@alliance.org', isActiveStaff: false }
      ]
    })
  ]
};

describe('ElementPanelComponent', () => {
  let fixture: ComponentFixture<ElementPanelComponent>;
  let api: {
    GET_StrategyFrameworkCodeProposal: jest.Mock;
    GET_StrategyFrameworkStaff: jest.Mock;
    POST_StrategyFrameworkElement: jest.Mock;
    PATCH_StrategyFrameworkElement: jest.Mock;
  };
  let actions: { showToast: jest.Mock; showGlobalAlert: jest.Mock; handleBadRequest: jest.Mock };
  let token = 0;

  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const form = () => fixture.nativeElement.querySelector('[data-testid="element-form"]') as HTMLElement | null;
  const open = async (elementId: number | null, create: { depth: number; parentRequired: boolean; parentId?: number } | null = null) => {
    token += 1;
    fixture.componentRef.setInput('elementId', elementId);
    fixture.componentRef.setInput('createRequest', create);
    fixture.componentRef.setInput('createToken', token);
    fixture.detectChanges();
    await settle();
  };

  beforeEach(async () => {
    token = 0;
    api = {
      GET_StrategyFrameworkCodeProposal: jest.fn().mockResolvedValue(ok({ code: '3' })),
      GET_StrategyFrameworkStaff: jest.fn().mockResolvedValue(ok([])),
      POST_StrategyFrameworkElement: jest.fn().mockResolvedValue(ok(VIEW.elements[0])),
      PATCH_StrategyFrameworkElement: jest.fn().mockResolvedValue(ok(VIEW.elements[2]))
    };
    actions = { showToast: jest.fn(), showGlobalAlert: jest.fn(), handleBadRequest: jest.fn() };
    await TestBed.configureTestingModule({
      imports: [ElementPanelComponent],
      providers: [provideNoopAnimations(), { provide: ApiService, useValue: api }, { provide: ActionsService, useValue: actions }]
    }).compileComponents();
    fixture = TestBed.createComponent(ElementPanelComponent);
    fixture.componentRef.setInput('portfolioId', 2);
    fixture.componentRef.setInput('view', VIEW);
    fixture.componentRef.setInput('elementId', null);
    fixture.componentRef.setInput('createRequest', null);
    fixture.componentRef.setInput('createToken', 0);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('shows the header, Delete above the fields, and Cancel with Save at the bottom', async () => {
    await open(1);

    expect(fixture.nativeElement.querySelector('p-' + 'drawer')).toBeNull();
    expect(document.querySelector('[data-testid="panel-level"]')?.textContent?.trim()).toBe('PERFORMANCE AREA · LEVEL 1');
    expect(document.querySelector('[data-testid="panel-code"]')?.textContent?.trim()).toBe('1');
    expect(document.querySelector('[data-testid="panel-title"]')?.textContent?.trim()).toBe('Area one');
    const remove = document.querySelector('[data-testid="element-delete"] button') as HTMLButtonElement;
    const code = document.querySelector('#elementCode') as HTMLInputElement;
    expect(remove.compareDocumentPosition(code) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(remove.classList.contains('p-button-outlined')).toBe(true);
    expect(remove.classList.contains('p-button-danger')).toBe(true);
    expect(remove.getAttribute('aria-disabled')).toBeNull();
    const labels = Array.from(document.querySelectorAll('[data-testid="element-actions"] button')).map(button => button.textContent?.trim());
    expect(labels).toEqual(['Cancel', 'Save']);
    expect(fixture.componentInstance.isDirty()).toBe(false);
  });

  it('hides Delete in create mode and does not mark an untouched proposal dirty', async () => {
    await open(null, { depth: 1, parentRequired: false });

    expect(document.querySelector('[data-testid="element-delete"]')).toBeNull();
    expect(api.GET_StrategyFrameworkCodeProposal).toHaveBeenCalledWith({ portfolioId: 2 });
    expect((document.querySelector('#elementCode') as HTMLInputElement).value).toBe('3');
    expect(document.querySelector('[data-testid="panel-title"]')?.textContent?.trim()).toBe('New Performance Area');
    expect(fixture.componentInstance.isDirty()).toBe(false);

    const name = document.querySelector('#elementName') as HTMLInputElement;
    name.value = 'Draft area';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.isDirty()).toBe(true);
  });

  it('lists only the elements one level up as parents', async () => {
    await open(20);

    const select = fixture.debugElement.query(By.directive(Select)).componentInstance as Select;
    const labels = (select.options as { label: string }[]).map(option => option.label);
    expect(labels).toEqual(['1 · Area one', '2 · Area two']);
    expect(labels.join(' ')).not.toContain('Dimension');
    expect(document.querySelector('app-staff-picker')).toBeNull();

    await open(31);
    const indicatorSelect = fixture.debugElement.query(By.directive(Select)).componentInstance as Select;
    const indicatorLabels = (indicatorSelect.options as { label: string }[]).map(option => option.label);
    expect(indicatorLabels).toEqual(['1.1 · Dimension one', '1.2 · Dimension two']);
    expect(document.querySelector('app-staff-picker')).not.toBeNull();
  });

  it('proposes a code for a root and, after a parent is chosen, only for that parent', async () => {
    await open(null, { depth: 1, parentRequired: false });
    expect((document.querySelector('#elementCode') as HTMLInputElement).value).toBe('3');

    api.GET_StrategyFrameworkCodeProposal.mockClear();
    await open(null, { depth: 2, parentRequired: true });
    expect(api.GET_StrategyFrameworkCodeProposal).not.toHaveBeenCalled();
    expect(document.querySelector('[data-testid="element-parent"]')).not.toBeNull();
    expect(fixture.componentInstance.isDirty()).toBe(false);

    api.GET_StrategyFrameworkCodeProposal.mockResolvedValue(ok({ code: '1.8' }));
    fixture.debugElement.query(By.directive(Select)).triggerEventHandler('onChange', { value: 1 });
    await settle();
    expect(api.GET_StrategyFrameworkCodeProposal).toHaveBeenCalledWith({ portfolioId: 2, parentId: 1 });
    expect((document.querySelector('#elementCode') as HTMLInputElement).value).toBe('1.8');
    expect(fixture.componentInstance.isDirty()).toBe(true);
  });

  it('prefills the parent from a tree create and proposes that parent’s code', async () => {
    api.GET_StrategyFrameworkCodeProposal.mockResolvedValue(ok({ code: '1.7' }));
    await open(null, { depth: 2, parentRequired: true, parentId: 1 });

    expect(fixture.componentInstance.form.controls.parentId.value).toBe(1);
    expect(api.GET_StrategyFrameworkCodeProposal).toHaveBeenCalledWith({ portfolioId: 2, parentId: 1 });
    expect((document.querySelector('#elementCode') as HTMLInputElement).value).toBe('1.7');
    expect(fixture.componentInstance.isDirty()).toBe(false);
  });

  it('names the parent level and recomputes the derived ancestor when the parent changes', async () => {
    const extended: FrameworkEditorView = {
      ...VIEW,
      elements: [...VIEW.elements, element({ id: 22, depth: 2, code: '2.1', name: 'Other dimension', parentId: 2 })]
    };
    fixture.componentRef.setInput('view', extended);
    await open(null, { depth: 3, parentRequired: true });

    expect(document.querySelector('[data-testid="panel-level"]')?.textContent?.trim()).toBe('INDICATOR · LEVEL 3');
    expect(document.querySelector('label[for="elementParent"]')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Dimension *');
    expect(document.querySelector('[data-testid="derived-ancestor"]')).toBeNull();

    await open(31);
    const field = () => document.querySelector('[data-testid="derived-ancestor"]') as HTMLInputElement;
    expect(document.querySelector('[data-testid="derived-label"]')?.textContent?.trim()).toBe('Performance Area (derived from the Dimension)');
    expect(field().value).toBe('1 · Area one');
    expect(field().readOnly).toBe(true);

    api.GET_StrategyFrameworkCodeProposal.mockClear();
    fixture.debugElement.query(By.directive(Select)).triggerEventHandler('onChange', { value: 22 });
    await settle();
    expect(field().value).toBe('2 · Area two');
    expect(api.GET_StrategyFrameworkCodeProposal).not.toHaveBeenCalled();
  });

  it('patches an indicator without a parent move and without staff names', async () => {
    api.PATCH_StrategyFrameworkElement.mockResolvedValue(ok({ ...VIEW.elements[4], name: 'Process efficiency updated' }));
    await open(31);
    const name = document.querySelector('#elementName') as HTMLInputElement;
    name.value = 'Process efficiency updated';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (document.querySelector('[data-testid="element-save"] button') as HTMLButtonElement).click();
    await settle();

    expect(api.PATCH_StrategyFrameworkElement).toHaveBeenCalledWith(31, {
      code: '1.1.1',
      name: 'Process efficiency updated',
      description: null,
      responsibleCarnets: ['IJ', 'PA']
    });
    const body = api.PATCH_StrategyFrameworkElement.mock.calls[0][1] as Record<string, unknown>;
    expect(body['parentId']).toBeUndefined();
    expect(actions.showToast).toHaveBeenCalledWith({ severity: 'success', summary: 'Saved', detail: '1.1.1 saved' });
  });

  it('keeps the typed values and shows a failed save in the panel', async () => {
    api.PATCH_StrategyFrameworkElement.mockResolvedValue(failed(409, { description: 'code is taken', field: 'code' }));
    await open(20);
    const name = document.querySelector('#elementName') as HTMLInputElement;
    name.value = 'Dimension one edited';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (document.querySelector('[data-testid="element-save"] button') as HTMLButtonElement).click();
    await settle();

    expect(document.querySelector('[data-testid="element-error"]')?.textContent?.trim()).toBe('code is taken');
    expect(name.value).toBe('Dimension one edited');
    expect(actions.showToast).not.toHaveBeenCalled();
    expect(actions.handleBadRequest).not.toHaveBeenCalled();
    expect(form()).not.toBeNull();
  });

  it('leaves a 401 off the form', async () => {
    api.PATCH_StrategyFrameworkElement.mockResolvedValue(failed(401, { description: 'Unauthorized' }));
    await open(20);
    (document.querySelector('[data-testid="element-save"] button') as HTMLButtonElement).click();
    await settle();

    expect(document.querySelector('[data-testid="element-error"]')).toBeNull();
    expect(actions.showToast).not.toHaveBeenCalled();
  });

  it('ignores a save response for a selection that is no longer current', async () => {
    await open(20);
    const name = document.querySelector('#elementName') as HTMLInputElement;
    name.value = 'Stale dimension';
    name.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    let resolvePatch: (value: MainResponse<FrameworkEditorElement>) => void = () => undefined;
    api.PATCH_StrategyFrameworkElement.mockReturnValue(new Promise(resolve => (resolvePatch = resolve)));
    (document.querySelector('[data-testid="element-save"] button') as HTMLButtonElement).click();
    await open(31);

    resolvePatch(ok(VIEW.elements[2]));
    await settle();

    expect(actions.showToast).not.toHaveBeenCalled();
    expect((document.querySelector('#elementName') as HTMLInputElement).value).toBe('Process efficiency');
    expect(document.querySelector('[data-testid="panel-level"]')?.textContent?.trim()).toBe('INDICATOR · LEVEL 3');
  });

  it('emits delete only when the element can be deleted, and shows the blocker reason otherwise', async () => {
    const requested: number[] = [];
    fixture.componentInstance.deleteRequested.subscribe(() => requested.push(1));
    await open(20);
    (document.querySelector('[data-testid="element-delete"] button') as HTMLButtonElement).click();
    expect(requested).toEqual([1]);

    const blocked: FrameworkEditorView = {
      ...VIEW,
      elements: VIEW.elements.map(item =>
        item.id === 20
          ? { ...item, deletable: false, blockers: [{ reason: 'children', count: 2, wayOut: 'Delete or move its 2 indicators first.' }] }
          : item
      )
    };
    fixture.componentRef.setInput('view', blocked);
    await open(20);
    const button = document.querySelector('[data-testid="element-delete"] button') as HTMLButtonElement;
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(document.querySelector('[data-testid="element-delete-reason"]')?.textContent?.trim()).toBe('Delete or move its 2 indicators first.');
    button.click();
    expect(requested).toEqual([1]);
  });

  it('restores the opened values on Cancel in edit mode', async () => {
    const kinds: string[] = [];
    fixture.componentInstance.cancelled.subscribe(kind => kinds.push(kind));
    await open(20);
    const description = document.querySelector('#elementDescription') as HTMLTextAreaElement;
    description.value = 'unsaved';
    description.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.componentInstance.isDirty()).toBe(true);

    (document.querySelector('[data-testid="element-cancel"] button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(kinds).toEqual(['edit']);
    expect(description.value).toBe('');
    expect(fixture.componentInstance.isDirty()).toBe(false);
  });
});
