import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MultiSelect } from 'primeng/multiselect';
import { FrameworkObjective, FrameworkView } from '@shared/interfaces/strategy-framework.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import { ObjectivePanelComponent } from './objective-panel.component';

// @akili-spec institutional-performance/strategy-framework T-16 — R-STF-009 AC.2, NFR-STF-004, D-STF-26.
// The panel starts closed. Tests open it the way the page does: bind `open` after the first render.
// jsdom cannot prove the focus ring, the drawer width, or the animation (KZ-017).

const ok = <T>(data: T): MainResponse<T> =>
  ({ data, status: 200, description: 'ok', timestamp: '', path: '', successfulRequest: true }) as MainResponse<T>;

const failed = (status: number, errorDetail: unknown): MainResponse<never> =>
  ({ data: undefined, status, description: 'error', timestamp: '', path: '', successfulRequest: false, errorDetail }) as unknown as MainResponse<never>;

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
    { id: 2, levelId: 1, depth: 1, code: '2', name: 'Area two', description: null, parentId: null, descendantCounts: {} },
    { id: 20, levelId: 2, depth: 2, code: '1.1', name: 'Dimension one', description: null, parentId: 1, descendantCounts: {} },
    { id: 31, levelId: 3, depth: 3, code: '1.1.1', name: 'Yield', description: null, parentId: 20, descendantCounts: {} },
    { id: 32, levelId: 3, depth: 3, code: '2.1.1', name: 'Reach', description: null, parentId: 2, descendantCounts: {} }
  ]
};

const OBJECTIVE: FrameworkObjective = {
  id: 10,
  portfolioId: 2,
  year: 2026,
  code: 'IOB-1',
  statement: 'Raise incomes',
  elements: [{ id: 31, code: '1.1.1', name: 'Yield' }],
  deletable: true,
  blockers: []
};

describe('ObjectivePanelComponent', () => {
  let fixture: ComponentFixture<ObjectivePanelComponent>;
  let api: {
    GET_StrategyFrameworkCodeProposal: jest.Mock;
    POST_StrategyFrameworkObjective: jest.Mock;
    PATCH_StrategyFrameworkObjective: jest.Mock;
  };
  let actions: { showToast: jest.Mock; showGlobalAlert: jest.Mock; handleBadRequest: jest.Mock };

  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const form = () => document.querySelector('[data-testid="objective-form"]') as HTMLElement | null;

  beforeEach(async () => {
    api = {
      GET_StrategyFrameworkCodeProposal: jest.fn().mockResolvedValue(ok({ code: 'IOB-29' })),
      POST_StrategyFrameworkObjective: jest.fn().mockResolvedValue(ok(OBJECTIVE)),
      PATCH_StrategyFrameworkObjective: jest.fn().mockResolvedValue(ok(OBJECTIVE))
    };
    actions = { showToast: jest.fn(), showGlobalAlert: jest.fn(), handleBadRequest: jest.fn() };
    await TestBed.configureTestingModule({
      imports: [ObjectivePanelComponent],
      providers: [provideNoopAnimations(), { provide: ApiService, useValue: api }, { provide: ActionsService, useValue: actions }]
    }).compileComponents();
    fixture = TestBed.createComponent(ObjectivePanelComponent);
    fixture.componentRef.setInput('open', false);
    fixture.componentRef.setInput('portfolioId', 2);
    fixture.componentRef.setInput('years', [2026, 2027, 2028, 2029, 2030]);
    fixture.componentRef.setInput('selectedYear', 2026);
    fixture.componentRef.setInput('objective', null);
    fixture.componentRef.setInput('framework', FRAMEWORK);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    document.querySelectorAll('.p-drawer, .p-drawer-mask, .p-overlay-mask').forEach(node => node.remove());
  });

  it('stays closed until opened, then traps focus and offers only indicator-level elements', async () => {
    expect(form()).toBeNull();

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await settle();

    const opened = form();
    expect(opened).not.toBeNull();
    const code = document.querySelector('#objectiveCode') as HTMLInputElement;
    const statement = opened?.querySelector('#objectiveStatement') as HTMLTextAreaElement;
    const save = document.querySelector('[data-testid="objective-save"] button') as HTMLButtonElement;
    statement.focus();
    save.focus();
    opened?.querySelector<HTMLElement>('[data-pc-section="lastfocusableelement"]')?.focus();
    expect(document.activeElement).toBe(code);
    expect(opened?.textContent?.toLowerCase()).not.toContain('owner');
    expect(opened?.querySelector('[formcontrolname="owner"], [name="owner"], [id="f-owner"]')).toBeNull();
    expect(opened?.querySelector('label[for="objectiveIndicators"]')?.textContent?.trim()).toBe('Linked indicators');

    const multi = fixture.debugElement.query(By.directive(MultiSelect)).componentInstance as MultiSelect;
    const labels = (multi.options as { items: { label: string; value: number }[] }[]).flatMap(group => group.items.map(item => item.label));
    expect(labels).toEqual(['1.1.1 · Yield', '2.1.1 · Reach']);
    expect(labels.join(' ')).not.toContain('Dimension');
    expect(labels.join(' ')).not.toContain('Area');
    expect(multi.filter).toBe(true);
    expect(multi.group).toBe(true);
    expect((document.querySelector('#objectiveCode') as HTMLInputElement).value).toBe('IOB-29');
    expect(document.querySelector('[data-testid="panel-level"]')?.textContent?.trim()).toBe('INSTITUTIONAL OBJECTIVE');
    expect(document.querySelector('[data-testid="panel-title"]')?.textContent?.trim()).toBe('New institutional objective');
    expect(document.querySelector('[data-testid="panel-code"]')).toBeNull();
    expect(document.querySelector('[data-testid="objective-panel-delete"]')).toBeNull();
    expect(api.GET_StrategyFrameworkCodeProposal).toHaveBeenCalledWith({ portfolioId: 2, year: 2026, kind: 'IOB' });
  });

  it('shows a 409 inline and does not toast', async () => {
    api.POST_StrategyFrameworkObjective.mockResolvedValue(failed(409, { description: 'Code IOB-29 is already used', field: 'code' }));
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await settle();

    fixture.componentInstance.form.setValue({ code: 'IOB-29', year: 2026, statement: 'A statement', elementIds: [] });
    fixture.detectChanges();
    (document.querySelector('[data-testid="objective-save"] button') as HTMLButtonElement).click();
    await settle();

    expect(document.querySelector('[data-testid="objective-error"]')?.textContent?.trim()).toBe('Code IOB-29 is already used');
    expect(actions.showToast).not.toHaveBeenCalled();
    expect(actions.showGlobalAlert).not.toHaveBeenCalled();
    expect(actions.handleBadRequest).not.toHaveBeenCalled();
    expect(form()).not.toBeNull();
  });

  it('patches an edit without an owner or a portfolio id', async () => {
    fixture.componentRef.setInput('objective', OBJECTIVE);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await settle();

    expect(document.querySelector('[data-testid="panel-title"]')?.textContent?.trim()).toBe('IOB-1 · 2026');
    const statement = document.querySelector('#objectiveStatement') as HTMLTextAreaElement;
    expect(statement.value).toBe('Raise incomes');
    statement.value = 'Updated incomes';
    statement.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (document.querySelector('[data-testid="objective-save"] button') as HTMLButtonElement).click();
    await settle();

    expect(api.PATCH_StrategyFrameworkObjective).toHaveBeenCalledWith(10, {
      year: 2026,
      code: 'IOB-1',
      statement: 'Updated incomes',
      elementIds: [31]
    });
    const body = api.PATCH_StrategyFrameworkObjective.mock.calls[0][1] as Record<string, unknown>;
    expect(body['portfolioId']).toBeUndefined();
    expect(body['owner']).toBeUndefined();
    expect(body['responsibleCarnets']).toBeUndefined();
    expect(api.POST_StrategyFrameworkObjective).not.toHaveBeenCalled();
  });
});
