import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MultiSelect } from 'primeng/multiselect';
import { Tooltip } from 'primeng/tooltip';
import { FrameworkObjective, FrameworkView } from '@shared/interfaces/strategy-framework.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import { ObjectivePanelComponent } from './objective-panel.component';

// @akili-spec institutional-performance/strategy-framework T-20 — R-STF-009, R-STF-016, D-STF-29, D-STF-33.
// The form is in the panel. KZ-015: it starts with nothing open; tests then set create or an id.
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

const BLOCKED: FrameworkObjective = {
  ...OBJECTIVE,
  id: 11,
  code: 'IOB-2',
  statement: 'Cut loss',
  elements: [],
  deletable: false,
  blockers: [{ reason: 'kpis', count: 1, wayOut: 'Remove its 1 record in KPIs first.' }]
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
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();
  };

  const form = () => document.querySelector('[data-testid="objective-form"]') as HTMLElement | null;
  const deleteTip = (button: HTMLElement) =>
    fixture.debugElement
      .queryAll(By.directive(Tooltip))
      .find(node => node.nativeElement === button)
      ?.injector.get(Tooltip);

  const typeInto = async (selector: string, value: string) => {
    const field = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
  };

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
    fixture.componentRef.setInput('portfolioId', 2);
    fixture.componentRef.setInput('years', [2026, 2027, 2028, 2029, 2030]);
    fixture.componentRef.setInput('selectedYear', 2026);
    fixture.componentRef.setInput('objectiveId', null);
    fixture.componentRef.setInput('creating', false);
    fixture.componentRef.setInput('createToken', 0);
    fixture.componentRef.setInput('objectives', [OBJECTIVE, BLOCKED]);
    fixture.componentRef.setInput('framework', FRAMEWORK);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('stays empty until create, then focuses the code and offers only indicator-level elements', async () => {
    expect(form()).toBeNull();
    // Concatenated so this absence check is not a use of the retired overlay tag.
    expect(document.querySelector('p-' + 'drawer')).toBeNull();

    fixture.componentRef.setInput('creating', true);
    fixture.componentRef.setInput('createToken', 1);
    fixture.detectChanges();
    await settle();

    const opened = form();
    expect(opened).not.toBeNull();
    expect(document.activeElement).toBe(document.querySelector('#objectiveCode'));
    expect(opened?.textContent?.toLowerCase()).not.toContain('owner');
    expect(opened?.querySelector('[formcontrolname="owner"], [name="owner"], [id="f-owner"]')).toBeNull();
    expect(opened?.querySelector('label[for="objectiveIndicators"]')?.textContent?.trim()).toBe('Linked indicators');
    // Concatenated so this absence check is not a use of the retired overlay tag.
    expect(document.querySelector('p-' + 'drawer')).toBeNull();

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
    expect(fixture.componentInstance.isDirty()).toBe(false);
  });

  it('puts Delete, Cancel and Save in the footer and shows the blocker reason when the objective cannot be deleted', async () => {
    fixture.componentRef.setInput('objectiveId', 11);
    fixture.detectChanges();
    await settle();

    expect(document.querySelector('[data-testid="panel-title"]')?.textContent?.trim()).toBe('IOB-2 · 2026');
    const footer = form()?.querySelector('[data-testid="objective-actions"]') as HTMLElement;
    const order = ['objective-panel-delete', 'objective-cancel', 'objective-save'].map(id => footer.querySelector(`[data-testid="${id}"]`));
    expect(order.every(element => element !== null)).toBe(true);
    for (let index = 1; index < order.length; index += 1) {
      expect(order[index - 1]!.compareDocumentPosition(order[index]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    const code = document.querySelector('#objectiveCode') as HTMLInputElement;
    const remove = order[0]!.querySelector('button') as HTMLButtonElement;
    expect(code.compareDocumentPosition(order[0]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(remove.getAttribute('aria-disabled')).toBe('true');
    expect(remove.hasAttribute('disabled')).toBe(false);
    expect(remove.getAttribute('aria-describedby')).toBe('objective-delete-reason');
    expect(remove.className).toContain('border-2');
    expect(remove.className).toContain('border-[var(--ac-red-1)]');
    expect(remove.className).toContain('text-[var(--ac-red-1)]');
    expect(remove.className).toContain('px-4');
    expect(remove.className).toContain('py-2');
    expect(remove.className).toContain('rounded-[13px]');
    expect(remove.className).toContain('text-[15px]');
    const cancel = order[1]!.querySelector('button') as HTMLButtonElement;
    const save = order[2]!.querySelector('button') as HTMLButtonElement;
    expect(cancel.classList.contains('ods-cancel')).toBe(true);
    expect(cancel.className).toContain('border-[var(--ac-light-blue-400)]');
    expect(cancel.className).toContain('text-[var(--ac-light-blue-400)]');
    expect(cancel.querySelector('i')).toBeNull();
    expect(save.classList.contains('ods-save')).toBe(true);
    const saveTokens = save.className.split(/\s+/);
    expect(saveTokens).toContain('border-2');
    expect(saveTokens).toContain('border-transparent');
    expect(save.className).toContain('disabled:border-transparent');
    expect(save.className).toContain('bg-[var(--ac-green-400)]');
    expect(save.className).toContain('px-5');
    expect(save.className).toContain('disabled:bg-[var(--ac-grey-200)]');
    expect(save.className).toContain('disabled:text-[var(--ac-grey-500)]');
    expect(save.type).toBe('submit');
    expect(save.querySelector('.pi-save')).not.toBeNull();
    expect(save.disabled).toBe(false);
    const reason = document.querySelector('[data-testid="objective-delete-reason"]');
    expect(reason?.id).toBe('objective-delete-reason');
    expect(reason?.classList.contains('sr-only')).toBe(true);
    expect(reason?.textContent?.trim()).toBe('Remove its 1 record in KPIs first.');
    const tip = deleteTip(remove);
    expect(tip?.content).toBe('Remove its 1 record in KPIs first.');
    expect(tip?.tooltipPosition).toBe('top');
    expect(tip?.tooltipEvent).toBe('both');
    expect(document.activeElement).not.toBe(code);
  });

  it('disables Save and swaps in a spinner while the save is in flight', async () => {
    fixture.componentRef.setInput('objectiveId', 10);
    fixture.detectChanges();
    await settle();
    await typeInto('#objectiveStatement', 'Updated incomes');
    let resolvePatch: (value: MainResponse<FrameworkObjective>) => void = () => undefined;
    api.PATCH_StrategyFrameworkObjective.mockReturnValue(new Promise(resolve => (resolvePatch = resolve)));

    const save = document.querySelector('[data-testid="objective-save"] button') as HTMLButtonElement;
    save.click();
    fixture.detectChanges();

    expect(save.disabled).toBe(true);
    expect(save.getAttribute('aria-busy')).toBe('true');
    expect(save.querySelector('.pi-spinner')).not.toBeNull();
    expect(save.querySelector('.pi-save')).toBeNull();
    expect(api.PATCH_StrategyFrameworkObjective).toHaveBeenCalledTimes(1);

    resolvePatch(ok({ ...OBJECTIVE, statement: 'Updated incomes' }));
    await settle();
    expect((document.querySelector('[data-testid="objective-save"] button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows a 409 inline and does not toast', async () => {
    api.POST_StrategyFrameworkObjective.mockResolvedValue(failed(409, { description: 'Code IOB-29 is already used', field: 'code' }));
    fixture.componentRef.setInput('creating', true);
    fixture.componentRef.setInput('createToken', 1);
    fixture.detectChanges();
    await settle();

    await typeInto('#objectiveStatement', 'A statement');
    (document.querySelector('[data-testid="objective-save"] button') as HTMLButtonElement).click();
    await settle();

    expect(document.querySelector('[data-testid="objective-error"]')?.textContent?.trim()).toBe('Code IOB-29 is already used');
    expect((document.querySelector('#objectiveStatement') as HTMLTextAreaElement).value).toBe('A statement');
    expect(actions.showToast).not.toHaveBeenCalled();
    expect(actions.showGlobalAlert).not.toHaveBeenCalled();
    expect(actions.handleBadRequest).not.toHaveBeenCalled();
    expect(form()).not.toBeNull();
    expect(fixture.componentInstance.isDirty()).toBe(true);
  });

  it('patches an edit without an owner or a portfolio id', async () => {
    fixture.componentRef.setInput('objectiveId', 10);
    fixture.detectChanges();
    await settle();

    expect(document.querySelector('[data-testid="panel-title"]')?.textContent?.trim()).toBe('IOB-1 · 2026');
    const enabledDelete = document.querySelector('[data-testid="objective-panel-delete"] button') as HTMLButtonElement;
    expect(enabledDelete.getAttribute('aria-disabled')).toBeNull();
    expect(deleteTip(enabledDelete)?.content ?? null).toBeNull();
    expect(document.querySelector('[data-testid="objective-delete-reason"]')).toBeNull();
    const statement = document.querySelector('#objectiveStatement') as HTMLTextAreaElement;
    expect(statement.value).toBe('Raise incomes');
    await typeInto('#objectiveStatement', 'Updated incomes');
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
    expect(actions.showToast).toHaveBeenCalledWith({ severity: 'success', summary: 'Saved', detail: 'IOB-1 saved' });
    expect(fixture.componentInstance.isDirty()).toBe(false);
  });

  it('keeps text typed during a pending save, and a refreshed list does not replace it', async () => {
    fixture.componentRef.setInput('objectiveId', 10);
    fixture.detectChanges();
    await settle();
    await typeInto('#objectiveStatement', 'X');
    let resolvePatch: (value: MainResponse<FrameworkObjective>) => void = () => undefined;
    api.PATCH_StrategyFrameworkObjective.mockReturnValue(new Promise(resolve => (resolvePatch = resolve)));
    (document.querySelector('[data-testid="objective-save"] button') as HTMLButtonElement).click();
    await typeInto('#objectiveStatement', 'XY');
    resolvePatch(ok({ ...OBJECTIVE, statement: 'X' }));
    await settle();

    fixture.componentRef.setInput('objectives', [{ ...OBJECTIVE, statement: 'X' }, BLOCKED]);
    fixture.detectChanges();
    await settle();

    expect((document.querySelector('#objectiveStatement') as HTMLTextAreaElement).value).toBe('XY');
    expect(fixture.componentInstance.isDirty()).toBe(true);
  });

  it('restores the saved statement when Cancel follows Save', async () => {
    fixture.componentRef.setInput('objectiveId', 10);
    fixture.detectChanges();
    await settle();
    await typeInto('#objectiveStatement', 'Updated incomes');
    api.PATCH_StrategyFrameworkObjective.mockResolvedValue(ok({ ...OBJECTIVE, statement: 'Updated incomes' }));
    (document.querySelector('[data-testid="objective-save"] button') as HTMLButtonElement).click();
    await settle();

    (document.querySelector('[data-testid="objective-cancel"] button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect((document.querySelector('#objectiveStatement') as HTMLTextAreaElement).value).toBe('Updated incomes');
    expect(fixture.componentInstance.isDirty()).toBe(false);
  });

  it('paints required labels, Aura controls, and the warning row when Statement is left empty', async () => {
    fixture.componentRef.setInput('creating', true);
    fixture.componentRef.setInput('createToken', 1);
    fixture.detectChanges();
    await settle();

    const codeLabel = document.querySelector('label[for="objectiveCode"]') as HTMLLabelElement;
    const statementLabel = document.querySelector('label[for="objectiveStatement"]') as HTMLLabelElement;
    const yearLabel = document.querySelector('label[for="objectiveYear"]') as HTMLLabelElement;
    expect(codeLabel.classList.contains('label')).toBe(true);
    expect(statementLabel.classList.contains('label')).toBe(true);
    expect(yearLabel.classList.contains('label')).toBe(true);
    expect(document.querySelector('label[for="objectiveIndicators"]')?.classList.contains('label')).toBe(true);
    expect(codeLabel.querySelector('.text-red-500')?.getAttribute('aria-hidden')).toBe('true');
    expect(statementLabel.querySelector('.text-red-500')?.textContent?.trim()).toBe('*');
    expect(yearLabel.querySelector('.text-red-500')?.classList.contains('text-red-500')).toBe(true);

    const code = document.querySelector('#objectiveCode') as HTMLInputElement;
    const statement = document.querySelector('#objectiveStatement') as HTMLTextAreaElement;
    expect(code.classList.contains('p-inputtext')).toBe(true);
    expect(statement.classList.contains('p-textarea')).toBe(true);

    statement.value = '';
    statement.dispatchEvent(new Event('input'));
    statement.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(statement.classList.contains('ods-field--invalid')).toBe(true);
    const error = document.querySelector('[data-testid="statement-error"]');
    expect(error?.querySelector('.material-symbols-rounded')?.textContent?.trim()).toBe('warning');
    expect(error?.textContent).toContain('Statement is required');
  });
});
