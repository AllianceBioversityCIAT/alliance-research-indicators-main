import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Select } from 'primeng/select';
import { OrgLifecycleDialogComponent, OrgLifecycleDone } from './org-lifecycle-dialog.component';
import { OrgLifecycleAction, OrgYearRange, OrgYearViewRow } from '@shared/interfaces/org-structure.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { row } from '../../../../../../../../testing/org-structure.fixture';

// @akili-spec institutional-performance/organizational-structure T-03 (client half) — R-ORG-005, 007,
// 008, 013, NFR-ORG-005. Real PrimeNG controls and the REAL `app-modal` / `AllModalsService`; every
// assertion reads the rendered DOM or the OUTGOING call (KZ-001). The modal re-parents itself to
// <body>, so queries go through `document.body`. KZ-015: states are reached by the transition the
// product performs (open, change the year, tick back-date, confirm).
//
// KZ-017 — what this cannot reach: jsdom has no layout, so `getClientRects()` is stubbed to make every
// element count as visible (the trap ignores hidden nodes); the Tab key is a dispatched KeyboardEvent,
// not the browser's own focus traversal; PrimeNG's overlay positioning (appendTo body) is T-06.

const ok = <T>(data: T): MainResponse<T> =>
  ({ data, status: 200, description: 'ok', timestamp: '', path: '', successfulRequest: true }) as MainResponse<T>;
const rejected = (status: number, errors: unknown): MainResponse<unknown> =>
  ({
    data: undefined,
    status,
    description: 'x',
    timestamp: '',
    path: '',
    successfulRequest: false,
    errorDetail: { errors }
  }) as MainResponse<unknown>;

const RANGE: OrgYearRange = { min: 2025, max: 2028, current: 2027 };
const ENTRY = row({ id: 5, code: 'ORG-5', levelCode: 'L4', name: 'Unit Five', parentId: 2 });
const ENDED = row({ id: 6, code: 'ORG-6', levelCode: 'L4', name: 'Gone Unit', status: 'inactive', statusFromYear: 2026 });
const REACTIVATABLE = row({ id: 8, code: 'ORG-8', levelCode: 'L4', name: 'Sleeping Unit', status: 'inactive', statusFromYear: 2026 });

// B1 for 2027 and for 2026 differ on purpose, so the options visibly follow the year.
const ROWS_2027 = [
  ENTRY,
  row({ id: 7, code: 'ORG-7', levelCode: 'L4', name: 'Sibling Unit' }),
  row({ id: 3, code: 'ORG-3', levelCode: 'L3', name: 'An Office' }),
  row({ id: 6, code: 'ORG-6', levelCode: 'L4', name: 'Gone Unit', status: 'inactive', statusFromYear: 2026 })
];
const ROWS_2026 = [ENTRY, row({ id: 9, code: 'ORG-9', levelCode: 'L4', name: 'Older Unit' }), ROWS_2027[3]];

const version = (from: number) => ({ ...ENTRY.version, from, to: null });

describe('OrgLifecycleDialogComponent', () => {
  let fixture: ComponentFixture<OrgLifecycleDialogComponent>;
  let api: Record<string, jest.Mock>;
  let toast: jest.Mock;
  let done: OrgLifecycleDone[];
  let closed: number;

  const q = (testId: string) => document.body.querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
  const buttons = () => Array.from(q('lifecycle-dialog')?.querySelectorAll('button') ?? []) as HTMLButtonElement[];
  const settle = async () => {
    for (let i = 0; i < 3; i++) {
      await fixture.whenStable();
      fixture.detectChanges();
    }
  };
  const selectOf = (testId: string) => {
    const host = fixture.debugElement.query(By.css(`[data-testid="${testId}"]`)) ?? null;
    return host;
  };
  const choose = async (testId: string, value: unknown) => {
    const el = selectOf(testId);
    el.triggerEventHandler('onChange', { value });
    el.triggerEventHandler('ngModelChange', value);
    await settle();
  };
  const optionsOf = (testId: string) => (selectOf(testId).componentInstance as Select).options as { id?: number }[] | number[];
  const innerButton = (testId: string) => q(testId)?.querySelector('button') as HTMLButtonElement;
  const tick = async (testId: string) => {
    const box = q(testId) as HTMLInputElement;
    box.checked = !box.checked;
    box.dispatchEvent(new Event('change'));
    await settle();
  };

  async function mount(action: OrgLifecycleAction, entry: OrgYearViewRow = ENTRY) {
    fixture = TestBed.createComponent(OrgLifecycleDialogComponent);
    fixture.componentRef.setInput('action', action);
    fixture.componentRef.setInput('row', entry);
    fixture.componentRef.setInput('range', RANGE);
    fixture.componentInstance.done.subscribe(d => done.push(d));
    fixture.componentInstance.closed.subscribe(() => closed++);
    fixture.detectChanges();
    await settle();
  }

  beforeEach(async () => {
    done = [];
    closed = 0;
    toast = jest.fn();
    api = {
      GET_OrgStructureUnits: jest.fn().mockImplementation((year: number) => Promise.resolve(ok(year === 2026 ? ROWS_2026 : ROWS_2027))),
      GET_OrgStructureHistory: jest.fn().mockResolvedValue(ok({ versions: [version(2026)], log: [] })),
      POST_OrgStructureInactivate: jest.fn().mockResolvedValue(ok({ id: 5 })),
      POST_OrgStructureReactivate: jest.fn().mockResolvedValue(ok({ id: 8 })),
      DELETE_OrgStructureUnit: jest.fn().mockResolvedValue(ok({ id: 5, mode: 'logical' }))
    };
    await TestBed.configureTestingModule({
      imports: [OrgLifecycleDialogComponent],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: api },
        { provide: ActionsService, useValue: { showToast: toast } }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    jest.restoreAllMocks();
  });

  describe('fields per action', () => {
    it('Inactivate: From year (default current), Successor, back-date; opens the orgUnitLifecycle modal', async () => {
      await mount('inactivate');

      expect(TestBed.inject(AllModalsService).modalConfig().orgUnitLifecycle.isOpen).toBe(true);
      expect(q('lifecycle-year')).toBeTruthy();
      expect(q('lifecycle-successor')).toBeTruthy();
      expect(q('lifecycle-backdate')).toBeTruthy();
      expect(optionsOf('lifecycle-year')).toEqual([2027, 2028]);
      expect(fixture.componentInstance.fromYear()).toBe(2027);
      expect(q('lifecycle-text')?.textContent).toContain('stays visible in earlier years');
      expect(innerButton('lifecycle-confirm').textContent).toContain('Inactivate');
    });

    it('Reactivate: a year and back-date, no Successor', async () => {
      await mount('reactivate', REACTIVATABLE);

      expect(q('lifecycle-year')).toBeTruthy();
      expect(q('lifecycle-backdate')).toBeTruthy();
      expect(q('lifecycle-successor')).toBeNull();
      expect(q('lifecycle-text')?.textContent).toContain('one new version');
      expect(innerButton('lifecycle-confirm').textContent).toContain('Reactivate');
    });

    it('Delete of an entry first seen BEFORE the current year is logical: a year, and it states the entry stays visible in earlier years', async () => {
      await mount('delete');

      expect(api['GET_OrgStructureHistory']).toHaveBeenCalledWith(5);
      expect(q('lifecycle-year')).toBeTruthy();
      expect(q('lifecycle-successor')).toBeNull();
      expect(q('lifecycle-text-logical')?.textContent).toContain('It stays visible in earlier years');
      expect(q('lifecycle-text-physical')).toBeNull();
    });

    it('Delete of an entry whose first version starts in the current year is physical: no year, no back-date, erased-for-good text', async () => {
      api['GET_OrgStructureHistory'].mockResolvedValue(ok({ versions: [version(2027)], log: [] }));

      await mount('delete');

      expect(q('lifecycle-text-physical')?.textContent).toContain('created in 2027');
      expect(q('lifecycle-text-physical')?.textContent).toContain('code becomes free');
      expect(q('lifecycle-year')).toBeNull();
      expect(q('lifecycle-backdate')).toBeNull();
      expect(q('lifecycle-text-logical')).toBeNull();
    });

    it('Delete decides from the FIRST version, not the latest: a 2026 start with a 2027 version is still logical', async () => {
      api['GET_OrgStructureHistory'].mockResolvedValue(ok({ versions: [version(2027), version(2026)], log: [] }));

      await mount('delete');

      expect(q('lifecycle-text-logical')).toBeTruthy();
    });

    it('Delete when B6 cannot be read says both outcomes and still lets the server decide', async () => {
      // A synchronous throw: a rejected ZoneAwarePromise awaited by native async code is reported as unhandled by zone.js.
      api['GET_OrgStructureHistory'].mockImplementation(() => {
        throw new Error('down');
      });

      await mount('delete');

      expect(q('lifecycle-text-unknown')?.textContent).toContain('erased for good');
      expect(innerButton('lifecycle-confirm').disabled).toBe(false);
    });
  });

  describe('successor options (R-ORG-007 AC.3)', () => {
    it('lists only entries of the same level that are active in From year, never the entry itself', async () => {
      await mount('inactivate');

      expect(api['GET_OrgStructureUnits']).toHaveBeenCalledWith(2027, false);
      expect((optionsOf('lifecycle-successor') as { id: number }[]).map(o => o.id)).toEqual([7]);
    });

    it('follows From year: changing the year reloads B1 for it and replaces the options (and drops a stale pick)', async () => {
      await mount('inactivate');
      await choose('lifecycle-successor', 7);
      await tick('lifecycle-backdate');

      await choose('lifecycle-year', 2026);

      expect(api['GET_OrgStructureUnits']).toHaveBeenLastCalledWith(2026, false);
      expect((optionsOf('lifecycle-successor') as { id: number }[]).map(o => o.id)).toEqual([9]);
      expect(fixture.componentInstance.successorId()).toBeNull();
    });
  });

  describe('back-date (R-ORG-005)', () => {
    it('warns only when a year before the current one is chosen, and sends backdate only then', async () => {
      await mount('inactivate');
      expect(q('lifecycle-backdate-warning')).toBeNull();

      await tick('lifecycle-backdate');
      expect(optionsOf('lifecycle-year')).toEqual([2025, 2026, 2027, 2028]);
      expect(q('lifecycle-backdate-warning')).toBeNull();

      await choose('lifecycle-year', 2026);
      expect(q('lifecycle-backdate-warning')?.textContent).toContain('Back-dating changes how past years look');

      innerButton('lifecycle-confirm').click();
      await settle();
      expect(api['POST_OrgStructureInactivate']).toHaveBeenCalledWith(5, { fromYear: 2026, backdate: true });
    });

    it('unticking back-date returns to the current year and removes the warning', async () => {
      await mount('inactivate');
      await tick('lifecycle-backdate');
      await choose('lifecycle-year', 2026);

      await tick('lifecycle-backdate');

      expect(q('lifecycle-backdate-warning')).toBeNull();
      expect(fixture.componentInstance.fromYear()).toBe(2027);
    });
  });

  describe('sending', () => {
    it('Inactivate sends fromYear and the chosen successor, toasts, and reports done', async () => {
      await mount('inactivate');
      await choose('lifecycle-successor', 7);

      innerButton('lifecycle-confirm').click();
      await settle();

      expect(api['POST_OrgStructureInactivate']).toHaveBeenCalledWith(5, { fromYear: 2027, successorId: 7 });
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', detail: 'Entry inactivated from 2027' }));
      expect(done).toEqual([{ action: 'inactivate', id: 5, mode: undefined }]);
    });

    it('Reactivate sends only the year', async () => {
      await mount('reactivate', REACTIVATABLE);

      innerButton('lifecycle-confirm').click();
      await settle();

      expect(api['POST_OrgStructureReactivate']).toHaveBeenCalledWith(8, { fromYear: 2027 });
      expect(done[0]).toEqual(expect.objectContaining({ action: 'reactivate', id: 8 }));
    });

    it('a physical delete sends no year and reports the mode the server returned', async () => {
      api['GET_OrgStructureHistory'].mockResolvedValue(ok({ versions: [version(2027)], log: [] }));
      api['DELETE_OrgStructureUnit'].mockResolvedValue(ok({ id: 5, mode: 'physical' }));
      await mount('delete');

      innerButton('lifecycle-confirm').click();
      await settle();

      expect(api['DELETE_OrgStructureUnit']).toHaveBeenCalledWith(5, null, false);
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ detail: 'Entry deleted' }));
      expect(done).toEqual([{ action: 'delete', id: 5, mode: 'physical' }]);
    });

    it('a logical delete sends the year', async () => {
      await mount('delete');

      innerButton('lifecycle-confirm').click();
      await settle();

      expect(api['DELETE_OrgStructureUnit']).toHaveBeenCalledWith(5, 2027, false);
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ detail: 'Entry deleted from 2027' }));
    });
  });

  describe('delete of an already-inactive entry keeps its end year (design §5.5, review round 1)', () => {
    it('offers no From year and no back-date, and says it is marked Deleted from the year it ended', async () => {
      await mount('delete', REACTIVATABLE);

      expect(q('lifecycle-text-logical')?.textContent).toContain('marked Deleted from 2026');
      expect(q('lifecycle-text-logical')?.textContent).toContain('stays visible in earlier years');
      expect(q('lifecycle-year')).toBeNull();
      expect(q('lifecycle-backdate')).toBeNull();
    });

    it('sends no year and toasts the server year; without one it falls back to the entry end year, never the dialog year', async () => {
      api['DELETE_OrgStructureUnit'].mockResolvedValueOnce(ok({ id: 8, mode: 'logical', fromYear: 2026 }));
      await mount('delete', REACTIVATABLE);

      innerButton('lifecycle-confirm').click();
      await settle();

      expect(api['DELETE_OrgStructureUnit']).toHaveBeenCalledWith(8, null, false);
      expect(toast).toHaveBeenLastCalledWith(expect.objectContaining({ detail: 'Entry deleted from 2026' }));
      fixture.destroy();

      api['DELETE_OrgStructureUnit'].mockResolvedValueOnce(ok({ id: 8, mode: 'logical' }));
      await mount('delete', REACTIVATABLE);
      innerButton('lifecycle-confirm').click();
      await settle();

      expect(toast).toHaveBeenLastCalledWith(expect.objectContaining({ detail: 'Entry deleted from 2026' }));
    });

    it('an ACTIVE entry toasts the year the server returned over the one picked', async () => {
      api['DELETE_OrgStructureUnit'].mockResolvedValueOnce(ok({ id: 5, mode: 'logical', fromYear: 2028 }));
      await mount('delete');

      innerButton('lifecycle-confirm').click();
      await settle();

      expect(toast).toHaveBeenLastCalledWith(expect.objectContaining({ detail: 'Entry deleted from 2028' }));
    });
  });

  describe('rejections', () => {
    it('a 409 shows the server description and leaves a SINGLE Close (R-ORG-013)', async () => {
      const text = 'ORG-5 has active children: ORG-7, ORG-8. Move or inactivate them first.';
      api['POST_OrgStructureInactivate'].mockResolvedValue(rejected(409, text));
      await mount('inactivate');
      expect(buttons().length).toBeGreaterThan(1);

      innerButton('lifecycle-confirm').click();
      await settle();

      expect(q('lifecycle-blocked')?.textContent).toContain(text);
      expect(buttons().map(b => b.textContent?.trim())).toEqual(['Close']);
      expect(q('lifecycle-confirm')).toBeNull();
      expect(done).toEqual([]);

      innerButton('lifecycle-close').click();
      await settle();

      expect(closed).toBe(1);
      expect(TestBed.inject(AllModalsService).modalConfig().orgUnitLifecycle.isOpen).toBe(false);
    });

    it('a 400 (successor or back-date) is shown inline and the form stays usable', async () => {
      api['POST_OrgStructureInactivate'].mockResolvedValue(rejected(400, 'The successor must be active in 2027.'));
      await mount('inactivate');

      innerButton('lifecycle-confirm').click();
      await settle();

      expect(q('lifecycle-error')?.textContent).toContain('The successor must be active in 2027.');
      expect(q('lifecycle-blocked')).toBeNull();
      expect(innerButton('lifecycle-confirm').disabled).toBe(false);
      expect(done).toEqual([]);
    });

    it('a 400 whose errors are {description, field} shows the description inline (server shape)', async () => {
      api['POST_OrgStructureInactivate'].mockResolvedValue(
        rejected(400, { description: 'The successor must be of the same level.', field: 'successorId' })
      );
      await mount('inactivate');

      innerButton('lifecycle-confirm').click();
      await settle();

      expect(q('lifecycle-error')?.textContent).toContain('The successor must be of the same level.');
      expect(q('lifecycle-error')?.textContent).not.toContain('successorId');
    });

    it('a 409 whose errors are {description} renders the single Close; a 404 bare string shows inline', async () => {
      api['DELETE_OrgStructureUnit'].mockResolvedValueOnce(rejected(404, 'Unit 5 not found'));
      await mount('delete');

      innerButton('lifecycle-confirm').click();
      await settle();
      expect(q('lifecycle-error')?.textContent).toContain('Unit 5 not found');

      api['DELETE_OrgStructureUnit'].mockResolvedValueOnce(rejected(409, { description: 'Linked records: 5. Inactivate instead.' }));
      innerButton('lifecycle-confirm').click();
      await settle();
      expect(q('lifecycle-blocked')?.textContent).toContain('Linked records: 5');
      expect(buttons().map(b => b.textContent?.trim())).toEqual(['Close']);
    });

    it('a network failure shows a generic inline message', async () => {
      api['POST_OrgStructureReactivate'].mockImplementation(() => {
        throw new Error('offline');
      });
      await mount('reactivate', REACTIVATABLE);

      innerButton('lifecycle-confirm').click();
      await settle();

      expect(q('lifecycle-error')?.textContent).toContain('We could not complete the action');
    });
  });

  describe('focus trap (NFR-ORG-005)', () => {
    // jsdom has no layout: every element is declared visible so the trap's own visibility filter keeps them.
    beforeEach(() => {
      jest.spyOn(Element.prototype, 'getClientRects').mockReturnValue([{ width: 10, height: 10 }] as unknown as DOMRectList);
    });

    const pressTab = (shiftKey: boolean) => {
      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
      (document.activeElement as HTMLElement).dispatchEvent(event);
      return event;
    };

    it('Tab from the last control (Confirm) moves focus to the FIRST control inside the dialog, and the browser default is cancelled', async () => {
      await mount('inactivate');
      const confirm = innerButton('lifecycle-confirm');
      confirm.focus();
      expect(document.activeElement).toBe(confirm);

      const event = pressTab(false);

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).not.toBe(confirm);
      expect(q('lifecycle-year')?.contains(document.activeElement)).toBe(true);
    });

    it('Shift+Tab from the first control moves focus to the LAST control (Confirm)', async () => {
      await mount('inactivate');
      const first = q('lifecycle-year')?.querySelector('[tabindex]:not([tabindex="-1"])') as HTMLElement;
      first.focus();
      expect(document.activeElement).toBe(first);

      const event = pressTab(true);

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(innerButton('lifecycle-confirm'));
    });

    // Review round 1: focus must stay INSIDE the dialog after a submit, or the trap (a keydown listener on
    // the modal container) never hears the next Tab. KZ-015: each state is reached by pressing Confirm.
    const insideDialog = () => q('lifecycle-dialog')?.contains(document.activeElement) === true;

    it('a 409 moves focus to the single Close button, and Tab from it stays inside the dialog', async () => {
      api['POST_OrgStructureInactivate'].mockResolvedValue(rejected(409, 'ORG-5 has active children.'));
      await mount('inactivate');
      const confirm = innerButton('lifecycle-confirm');
      confirm.focus();

      confirm.click();
      await settle();

      expect(q('lifecycle-confirm')).toBeNull();
      expect(document.activeElement).toBe(innerButton('lifecycle-close'));
      const event = pressTab(false);
      expect(event.defaultPrevented).toBe(true);
      expect(insideDialog()).toBe(true);
      expect(document.activeElement).toBe(innerButton('lifecycle-close'));
    });

    it('a 400 returns focus to Confirm, inside the dialog, once the inline error is shown', async () => {
      api['POST_OrgStructureInactivate'].mockResolvedValue(rejected(400, { description: 'Bad successor', field: 'successorId' }));
      await mount('inactivate');
      const confirm = innerButton('lifecycle-confirm');
      confirm.focus();

      confirm.click();
      await settle();

      expect(q('lifecycle-error')).toBeTruthy();
      expect(insideDialog()).toBe(true);
      expect(document.activeElement).toBe(innerButton('lifecycle-confirm'));
    });

    it('while the request is in flight focus is not left on <body> (Confirm is disabled by then)', async () => {
      let release: (value: unknown) => void = () => undefined;
      api['POST_OrgStructureInactivate'].mockReturnValue(new Promise(resolve => (release = resolve)));
      await mount('inactivate');
      const confirm = innerButton('lifecycle-confirm');
      confirm.focus();

      confirm.click();
      await settle();

      expect(innerButton('lifecycle-confirm').disabled).toBe(true);
      // jsdom keeps focus on a disabled button (browsers drop it), so the observable contract is where the
      // dialog PUT it: its own container, which is inside the trap.
      expect(document.activeElement).not.toBe(document.body);
      expect(document.activeElement).toBe(q('lifecycle-dialog'));

      release(ok({ id: 5 }));
      await settle();
    });

    it('Tab from a control in the middle is left to the browser (not cancelled)', async () => {
      await mount('inactivate');
      innerButton('lifecycle-cancel').focus();

      expect(pressTab(false).defaultPrevented).toBe(false);
    });
  });

  it('destroying the dialog closes the modal (no stale open state for the next opening)', async () => {
    await mount('inactivate');
    expect(TestBed.inject(AllModalsService).modalConfig().orgUnitLifecycle.isOpen).toBe(true);

    fixture.destroy();

    expect(TestBed.inject(AllModalsService).modalConfig().orgUnitLifecycle.isOpen).toBe(false);
  });
});
