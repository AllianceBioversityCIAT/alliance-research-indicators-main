import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AutoComplete } from 'primeng/autocomplete';
import { Select } from 'primeng/select';
import { FrameworkEditorElement, FrameworkEditorView, FrameworkLevel } from '@shared/interfaces/strategy-framework.interface';
import { GlobalAlert } from '@shared/interfaces/global-alert.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import { ElementPanelComponent } from './element-panel.component';

// @akili-spec institutional-performance/strategy-framework T-15 — R-STF-003, R-STF-004, R-STF-007, NFR-STF-004, F-4.
// The panel starts closed. Tests open it the way the page does.
// jsdom cannot prove the focus ring, the drawer width, real Tab order, or Shift+Tab (KZ-017).
// The trap test focuses the sentinel with a real focus(); a synthetic FocusEvent drops relatedTarget.

const ok = <T>(data: T): MainResponse<T> =>
  ({ data, status: 200, description: 'ok', timestamp: '', path: '', successfulRequest: true }) as MainResponse<T>;

const failed = (status: number, errorDetail: unknown): MainResponse<never> =>
  ({ data: undefined, status, description: 'error', timestamp: '', path: '', successfulRequest: false, errorDetail }) as unknown as MainResponse<never>;

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
    GET_StrategyFrameworkElementBlockers: jest.Mock;
    DELETE_StrategyFrameworkElement: jest.Mock;
    GET_StrategyFrameworkEditor: jest.Mock;
  };
  let actions: { showToast: jest.Mock; showGlobalAlert: jest.Mock; handleBadRequest: jest.Mock };
  let alerts: GlobalAlert[];

  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const form = () => document.querySelector('[data-testid="element-form"]') as HTMLElement | null;
  const open = async (elementId: number | null, create: { depth: number; parentRequired: boolean } | null = null) => {
    fixture.componentRef.setInput('elementId', elementId);
    fixture.componentRef.setInput('createRequest', create);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await settle();
  };

  beforeEach(async () => {
    alerts = [];
    api = {
      GET_StrategyFrameworkCodeProposal: jest.fn().mockResolvedValue(ok({ code: '3' })),
      GET_StrategyFrameworkStaff: jest.fn().mockResolvedValue(ok([])),
      POST_StrategyFrameworkElement: jest.fn().mockResolvedValue(ok(VIEW.elements[0])),
      PATCH_StrategyFrameworkElement: jest.fn().mockResolvedValue(ok(VIEW.elements[2])),
      GET_StrategyFrameworkElementBlockers: jest.fn().mockResolvedValue(ok({ children: 0, objectives: 0, consumers: [], wayOut: [] })),
      DELETE_StrategyFrameworkElement: jest.fn().mockResolvedValue(ok({ id: 20 })),
      GET_StrategyFrameworkEditor: jest.fn().mockResolvedValue(ok(VIEW))
    };
    actions = {
      showToast: jest.fn(),
      showGlobalAlert: jest.fn((alert: GlobalAlert) => {
        alerts.push(alert);
      }),
      handleBadRequest: jest.fn()
    };
    await TestBed.configureTestingModule({
      imports: [ElementPanelComponent],
      providers: [provideNoopAnimations(), { provide: ApiService, useValue: api }, { provide: ActionsService, useValue: actions }]
    }).compileComponents();
    fixture = TestBed.createComponent(ElementPanelComponent);
    fixture.componentRef.setInput('open', false);
    fixture.componentRef.setInput('portfolioId', 2);
    fixture.componentRef.setInput('view', VIEW);
    fixture.componentRef.setInput('elementId', null);
    fixture.componentRef.setInput('createRequest', null);
    fixture.componentRef.setInput('surface', 'editor');
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    document.querySelectorAll('.p-drawer, .p-drawer-mask, .p-overlay-mask').forEach(node => node.remove());
  });

  it('stays closed until opened, then traps focus and offers Save, Cancel and Delete only', async () => {
    expect(form()).toBeNull();

    await open(1);

    const opened = form();
    expect(opened).not.toBeNull();
    expect(document.querySelector('[data-testid="panel-level"]')?.textContent?.trim()).toBe('PERFORMANCE AREA · LEVEL 1');
    expect(document.querySelector('[data-testid="panel-code"]')?.textContent?.trim()).toBe('1');
    expect(document.querySelector('[data-testid="panel-title"]')?.textContent?.trim()).toBe('Area one');
    expect(document.querySelector('[data-testid="code-hint"]')?.textContent?.trim()).toBe('Must be unique within the portfolio.');
    const remove = document.querySelector('[data-testid="element-delete"] button') as HTMLButtonElement;
    expect(remove.classList.contains('p-button-outlined')).toBe(true);
    expect(remove.classList.contains('p-button-danger')).toBe(true);
    expect(document.querySelector('[data-testid="element-parent"]')).toBeNull();
    expect(document.querySelector('app-staff-picker')).toBeNull();
    const labels = Array.from(document.querySelectorAll('[data-testid="element-actions"] button')).map(button => button.textContent?.trim());
    expect(labels).toEqual(['Delete', 'Cancel', 'Save']);

    const code = document.querySelector('#elementCode') as HTMLInputElement;
    const description = opened?.querySelector('#elementDescription') as HTMLTextAreaElement;
    const save = document.querySelector('[data-testid="element-save"] button') as HTMLButtonElement;
    description.focus();
    save.focus();
    opened?.querySelector<HTMLElement>('[data-pc-section="lastfocusableelement"]')?.focus();
    expect(document.activeElement).toBe(code);
  });

  it('lists only the elements one level up as parents', async () => {
    await open(20);

    const select = fixture.debugElement.query(By.directive(Select)).componentInstance as Select;
    const labels = (select.options as { label: string }[]).map(option => option.label);
    expect(labels).toEqual(['1 · Area one', '2 · Area two']);
    expect(labels.join(' ')).not.toContain('Dimension');
    expect(labels.join(' ')).not.toContain('1.1.1');
    expect(document.querySelector('app-staff-picker')).toBeNull();

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    await open(31);
    const indicatorSelect = fixture.debugElement.query(By.directive(Select)).componentInstance as Select;
    const indicatorLabels = (indicatorSelect.options as { label: string }[]).map(option => option.label);
    expect(indicatorLabels).toEqual(['1.1 · Dimension one', '1.2 · Dimension two']);
    expect(indicatorLabels.join(' ')).not.toContain('Area');
    expect(document.querySelector('app-staff-picker')).not.toBeNull();
  });

  it('proposes a code for a root and, after a parent is chosen, only for that parent', async () => {
    await open(null, { depth: 1, parentRequired: false });
    expect(api.GET_StrategyFrameworkCodeProposal).toHaveBeenCalledWith({ portfolioId: 2 });
    expect((document.querySelector('#elementCode') as HTMLInputElement).value).toBe('3');
    expect(document.querySelector('[data-testid="panel-title"]')?.textContent?.trim()).toBe('New Performance Area');
    expect(document.querySelector('[data-testid="panel-code"]')?.textContent?.trim()).toBe('3');
    expect(document.querySelector('[data-testid="code-hint"]')?.textContent?.trim()).toBe(
      'Proposed automatically. Must be unique within the portfolio.'
    );
    expect(document.querySelector('[data-testid="element-parent"]')).toBeNull();

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    api.GET_StrategyFrameworkCodeProposal.mockClear();
    await open(null, { depth: 2, parentRequired: true });
    expect(api.GET_StrategyFrameworkCodeProposal).not.toHaveBeenCalled();
    expect(document.querySelector('[data-testid="element-parent"]')).not.toBeNull();

    api.GET_StrategyFrameworkCodeProposal.mockResolvedValue(ok({ code: '1.8' }));
    fixture.debugElement.query(By.directive(Select)).triggerEventHandler('onChange', { value: 1 });
    await settle();
    expect(api.GET_StrategyFrameworkCodeProposal).toHaveBeenCalledWith({ portfolioId: 2, parentId: 1 });
    expect((document.querySelector('#elementCode') as HTMLInputElement).value).toBe('1.8');
  });

  it('names the parent level and recomputes the derived ancestor when the parent changes', async () => {
    const extended: FrameworkEditorView = {
      ...VIEW,
      elements: [...VIEW.elements, element({ id: 22, depth: 2, code: '2.1', name: 'Other dimension', parentId: 2 })]
    };
    fixture.componentRef.setInput('view', extended);
    await open(null, { depth: 3, parentRequired: true });

    expect(document.querySelector('[data-testid="panel-level"]')?.textContent?.trim()).toBe('INDICATOR · LEVEL 3');
    expect(document.querySelector('[data-testid="panel-title"]')?.textContent?.trim()).toBe('New Indicator');
    expect(document.querySelector('[data-testid="panel-code"]')).toBeNull();
    expect(document.querySelector('label[for="elementParent"]')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Dimension *');
    expect(document.querySelector('[data-testid="derived-ancestor"]')).toBeNull();

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    await open(31);

    const label = document.querySelector('[data-testid="derived-label"]')?.textContent?.trim();
    const field = () => document.querySelector('[data-testid="derived-ancestor"]') as HTMLInputElement;
    expect(label).toBe('Performance Area (derived from the Dimension)');
    expect(field().value).toBe('1 · Area one');
    expect(field().readOnly).toBe(true);

    api.GET_StrategyFrameworkCodeProposal.mockClear();
    api.GET_StrategyFrameworkEditor.mockClear();
    fixture.debugElement.query(By.directive(Select)).triggerEventHandler('onChange', { value: 22 });
    await settle();

    expect(field().value).toBe('2 · Area two');
    expect(api.GET_StrategyFrameworkCodeProposal).not.toHaveBeenCalled();
    expect(api.GET_StrategyFrameworkEditor).not.toHaveBeenCalled();
  });

  it('patches an indicator without a parent move and without staff names', async () => {
    api.PATCH_StrategyFrameworkElement.mockResolvedValue(ok(VIEW.elements[4]));
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
    expect(body['portfolioId']).toBeUndefined();
    expect(body['email']).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('Idris');
    expect(actions.showToast).toHaveBeenCalledWith({ severity: 'success', summary: 'Saved', detail: '1.1.1 saved' });
  });

  it('shows a save error from frameworkErrorOf and does not toast', async () => {
    api.PATCH_StrategyFrameworkElement.mockResolvedValue(failed(409, { description: 'code is taken', field: 'code' }));
    await open(20);
    (document.querySelector('[data-testid="element-save"] button') as HTMLButtonElement).click();
    await settle();

    expect(document.querySelector('[data-testid="element-error"]')?.textContent?.trim()).toBe('code is taken');
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

  it('asks the shared delete handler to confirm, with Close-only when blocked', async () => {
    await open(20);
    (document.querySelector('[data-testid="element-delete"] button') as HTMLButtonElement).click();
    await settle();

    expect(alerts).toHaveLength(1);
    expect(alerts[0].detail).toBe('Delete Dimension 1.1 · Dimension one?');
    expect(alerts[0].hideCloseButton).toBe(true);
    expect(alerts[0].confirmCallback?.label).toBe('Delete');
    expect(alerts[0].cancelCallback?.label).toBe('Cancel');

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();
    alerts.length = 0;
    api.GET_StrategyFrameworkElementBlockers.mockResolvedValue(
      ok({ children: 2, objectives: 0, consumers: [], wayOut: ['Delete or move its 2 indicators first.'] })
    );
    await open(20);
    (document.querySelector('[data-testid="element-delete"] button') as HTMLButtonElement).click();
    await settle();
    expect(api.DELETE_StrategyFrameworkElement).not.toHaveBeenCalled();
    expect(alerts[0].confirmCallback?.label).toBe('Close');
    expect(alerts[0].hasNoCancelButton).toBe(true);
    expect(alerts[0].hideCloseButton).toBe(true);
  });

  it('closes only the staff search overlay on Escape, then the drawer', async () => {
    const media = installMatchMedia();
    try {
      fixture.componentInstance.closed.subscribe(() => fixture.componentRef.setInput('open', false));
      await open(31);
      const name = document.querySelector('#elementName') as HTMLInputElement;
      name.value = 'Process efficiency edited';
      name.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();

      const auto = fixture.debugElement.query(By.directive(AutoComplete)).componentInstance as AutoComplete;
      auto.show();
      await settle();
      expect(document.querySelector('.p-autocomplete-overlay')).not.toBeNull();

      pressEscape(document.querySelector('#staffPickerInput') as HTMLElement);
      await settle();
      expect(document.querySelector('[data-testid="element-form"]')).not.toBeNull();
      expect(document.querySelector('.p-autocomplete-overlay')).toBeNull();
      expect((document.querySelector('#elementName') as HTMLInputElement).value).toBe('Process efficiency edited');

      pressEscape(document.querySelector('#elementCode') as HTMLElement);
      await settle();
      expect(document.querySelector('[data-testid="element-form"]')).toBeNull();
    } finally {
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
