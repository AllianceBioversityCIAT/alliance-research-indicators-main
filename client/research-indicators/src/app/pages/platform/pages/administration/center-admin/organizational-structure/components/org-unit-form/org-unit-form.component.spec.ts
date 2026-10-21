import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AutoComplete } from 'primeng/autocomplete';
import { Select } from 'primeng/select';
import { Tooltip } from 'primeng/tooltip';
import { OrgUnitFormComponent } from './org-unit-form.component';
import { OrgStaffOption, OrgYearRange, OrgYearViewRow } from '@shared/interfaces/org-structure.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import { row, staff } from '../../../../../../../../testing/org-structure.fixture';

// @akili-spec institutional-performance/organizational-structure T-02 (client half) — R-ORG-002..005,
// 013, 016, 017. Real PrimeNG controls; every assertion reads the rendered DOM or the OUTGOING payload
// (KZ-001). KZ-015: each state is reached by the transition the product performs (open the form,
// change a field, toggle back-date), never by presetting the end state. Overlay positioning is T-06.

const ok = <T>(data: T): MainResponse<T> =>
  ({ data, status: 200, description: 'ok', timestamp: '', path: '', successfulRequest: true }) as MainResponse<T>;
const rejected = (errors: unknown): MainResponse<unknown> =>
  ({
    data: undefined,
    status: 400,
    description: 'Bad',
    timestamp: '',
    path: '',
    successfulRequest: false,
    errorDetail: { errors }
  }) as MainResponse<unknown>;

const RANGE: OrgYearRange = { min: 2025, max: 2027, current: 2026 };
const LEVELS = [
  { id: 20, value: 'Division' },
  { id: 21, value: 'Department' },
  { id: 22, value: 'Office' },
  { id: 23, value: 'Unit' }
];
const person = (carnet: string, name: string): OrgStaffOption => ({ carnet, name, email: `${carnet}@example.org` });

const DIVISION = row({ id: 10, code: 'ORG-10', levelCode: 'L1', name: 'Division Ten' });
const DEPARTMENT = row({
  id: 2,
  code: 'ORG-2',
  levelCode: 'L2',
  name: 'Data Department',
  parentId: 10,
  parentCode: 'ORG-10',
  parentName: 'Division Ten'
});
const OFFICE = row({ id: 3, code: 'ORG-3', levelCode: 'L3', name: 'Data Office', parentId: 2, parentCode: 'ORG-2', parentName: 'Data Department' });
const ENDED_2026 = row({ id: 4, code: 'ORG-4', levelCode: 'L2', name: 'Ended Department', parentId: 10, status: 'inactive', statusFromYear: 2026 });
const ENDED_2028 = row({
  id: 6,
  code: 'ORG-6',
  levelCode: 'L2',
  name: 'Late Ended Department',
  parentId: 10,
  status: 'inactive',
  statusFromYear: 2028
});
const EDITED = row({
  id: 7,
  code: 'ORG-7',
  levelCode: 'L2',
  name: 'Editable Department',
  parentId: 10,
  parentCode: 'ORG-10',
  parentName: 'Division Ten',
  acronym: 'ED',
  director: staff('A1', 'Ana Director'),
  delegates: [staff('B1', 'Beto Delegate'), staff('B2', 'Cira Gone', false)]
});
const ALL = [DIVISION, DEPARTMENT, OFFICE, ENDED_2026, ENDED_2028, EDITED];

describe('OrgUnitFormComponent', () => {
  let fixture: ComponentFixture<OrgUnitFormComponent>;
  let api: Record<string, jest.Mock>;
  let toast: jest.Mock;

  const root = () => fixture.nativeElement as HTMLElement;
  const q = (testId: string) => root().querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
  // Not `whenStable()`: it also waits out `app-input`'s 2000 ms autosave debounce (a no-op here), so every
  // keystroke cost 2 s of wall time and a two-keystroke test sat ~0.8 s under Jest's 5 s timeout. A macrotask
  // turn drains every microtask (mocked API promises, ngModel writes) without waiting on that timer.
  const settle = async () => {
    for (let i = 0; i < 3; i++) {
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      fixture.detectChanges();
    }
  };
  const type = async (testId: string, text: string) => {
    const input = q(testId)?.querySelector('input') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await settle();
  };
  const choose = async (testId: string, value: number) => {
    // `field-level` and `field-applies-from` carry the testid on the p-select host itself.
    const host = fixture.debugElement.query(By.css(`[data-testid="${testId}"]`));
    const el = host.componentInstance instanceof Select ? host : host.query(By.directive(Select));
    el.triggerEventHandler('onChange', { value });
    el.triggerEventHandler('ngModelChange', value);
    await settle();
  };
  const optionsOf = (testId: string): unknown[] => {
    const host = fixture.debugElement.query(By.css(`[data-testid="${testId}"]`));
    const el = host.componentInstance instanceof Select ? host : host.query(By.directive(Select));
    return (el.componentInstance as Select).options as unknown[];
  };
  const auto = (testId: string) => fixture.debugElement.query(By.css(`[data-testid="${testId}"]`)).query(By.directive(AutoComplete));
  const search = async (testId: string, query: string) => {
    auto(testId).triggerEventHandler('completeMethod', { query });
    await settle();
    return ((auto(testId).componentInstance as AutoComplete).suggestions ?? []) as OrgStaffOption[];
  };
  const pick = async (testId: string, value: unknown) => {
    auto(testId).triggerEventHandler('ngModelChange', value);
    await settle();
  };
  // T-09: the delegates search is single-value. A pick goes through the control's real option-select path
  // (model update, input text, onSelect), the same one a click on a suggestion runs.
  const pickDelegate = async (person: OrgStaffOption) => {
    (auto('field-delegates').componentInstance as AutoComplete).onOptionSelect(new Event('click'), person);
    await settle();
  };
  const clickSave = async () => {
    (q('save-button')?.querySelector('button') as HTMLButtonElement).click();
    await settle();
  };

  async function mount(
    opts: {
      row?: OrgYearViewRow | null;
      rows?: OrgYearViewRow[];
      prefill?: { parentId: number | null; levelId: number | null } | null;
      range?: OrgYearRange;
    } = {}
  ) {
    fixture = TestBed.createComponent(OrgUnitFormComponent);
    fixture.componentRef.setInput('row', opts.row ?? null);
    fixture.componentRef.setInput('rows', opts.rows ?? ALL);
    fixture.componentRef.setInput('range', opts.range ?? RANGE);
    fixture.componentRef.setInput('prefill', opts.prefill ?? null);
    fixture.detectChanges();
    await settle();
  }

  beforeEach(async () => {
    toast = jest.fn();
    api = {
      GET_OrgStructureCodeProposal: jest.fn().mockResolvedValue(ok({ code: 'ORG-118' })),
      GET_ControlListValuesByKey: jest.fn().mockResolvedValue(ok(LEVELS)),
      GET_OrgStaff: jest.fn().mockResolvedValue(ok([])),
      POST_OrgStructureUnit: jest.fn().mockResolvedValue(ok({ id: 99 })),
      PATCH_OrgStructureUnit: jest.fn().mockResolvedValue(ok({ id: 7 }))
    };
    await TestBed.configureTestingModule({
      imports: [OrgUnitFormComponent],
      providers: [provideNoopAnimations(), { provide: ApiService, useValue: api }, { provide: ActionsService, useValue: { showToast: toast } }]
    }).compileComponents();
  });

  describe('create: fields per level and code', () => {
    it('pre-fills the proposed code (B3) and loads the level list by key, active only', async () => {
      await mount({ row: null });

      expect((q('field-code')?.querySelector('input') as HTMLInputElement).value).toBe('ORG-118');
      expect(api['GET_ControlListValuesByKey']).toHaveBeenCalledWith('org.level', true);
      expect(optionsOf('field-level')).toEqual(LEVELS.map(l => ({ id: l.id, label: `L${l.id - 19} ${l.value}` })));
    });

    it('Parent is hidden for a Division and appears when the level changes to Department (transition)', async () => {
      await mount({ row: null });
      await choose('field-level', 20);
      expect(q('field-parent')).toBeNull();

      await choose('field-level', 21);

      expect(q('field-parent')).toBeTruthy();
    });

    it('empty module: the first entry is a Division with no parent, posted without parentId', async () => {
      await mount({ row: null, rows: [] });
      expect(q('field-parent')).toBeNull();
      await type('field-name', 'First Division');

      await clickSave();

      expect(api['POST_OrgStructureUnit']).toHaveBeenCalledTimes(1);
      const body = api['POST_OrgStructureUnit'].mock.calls[0][0];
      expect(body).toEqual({ code: 'ORG-118', levelId: 20, name: 'First Division', appliesFromYear: 2026 });
      expect('parentId' in body).toBe(false);
    });
  });

  describe('parent picker (R-ORG-003, 013)', () => {
    it('offers only allowed levels and drops entries ended on or before Applies from year', async () => {
      await mount({ row: null });
      await choose('field-level', 23); // Unit: parent is a Department or an Office
      const labels = () => (optionsOf('field-parent') as { id: number }[]).map(o => o.id);

      // Applies from 2026: ORG-4 ended from 2026 (out), ORG-6 ends 2028 (still a valid parent), the Division is the wrong level.
      expect(labels().sort()).toEqual([2, 3, 6, 7]);

      await choose('field-applies-from', 2027);
      expect(labels().sort()).toEqual([2, 3, 6, 7]);
    });

    it('a parent that becomes unusable after the level changes is cleared', async () => {
      await mount({ row: null, prefill: { parentId: 10, levelId: 21 } });
      expect((optionsOf('field-parent') as { id: number }[]).map(o => o.id)).toContain(10);

      await choose('field-level', 22); // Office: only Departments may be its parent

      expect((optionsOf('field-parent') as { id: number }[]).map(o => o.id)).not.toContain(10);
      expect(q('save-button')?.querySelector('button')?.hasAttribute('disabled')).toBe(true);
    });

    it('shows each option with its path', async () => {
      await mount({ row: null });
      await choose('field-level', 22);

      const labels = (optionsOf('field-parent') as { label: string }[]).map(o => o.label);

      expect(labels).toContain('ORG-2 Division Ten / Data Department (Department)');
    });
  });

  describe('Applies from year and Back-date (R-ORG-004, 005, 013)', () => {
    it('is hidden on open, appears once a versioned field changes, and hides again when it is changed back (transition)', async () => {
      await mount({ row: EDITED });
      expect(q('applies-from-group')).toBeNull();

      await type('field-name', 'Renamed Department');
      expect(q('applies-from-group')).toBeTruthy();

      await type('field-name', 'Editable Department');
      expect(q('applies-from-group')).toBeNull();
    });

    it('stays hidden for a code-only edit, which sends only the code', async () => {
      await mount({ row: EDITED });

      await type('field-code', 'ORG-77');
      expect(q('applies-from-group')).toBeNull();
      await clickSave();

      expect(api['PATCH_OrgStructureUnit']).toHaveBeenCalledWith(7, { code: 'ORG-77' });
    });

    it('Back-date unlocks earlier years and the warning appears before save (transition)', async () => {
      await mount({ row: EDITED });
      await type('field-name', 'Renamed Department');
      expect(optionsOf('field-applies-from')).toEqual([2026, 2027]);
      expect(q('backdate-warning')).toBeNull();

      (q('field-backdate') as HTMLInputElement).click();
      await settle();
      expect(optionsOf('field-applies-from')).toEqual([2025, 2026, 2027]);
      expect(q('backdate-warning')).toBeNull();

      await choose('field-applies-from', 2025);
      expect(q('backdate-warning')).toBeTruthy();
    });

    it('a one-year module (min = max = current) still offers next year, with and without Back-date (D-ORG-20)', async () => {
      await mount({ row: EDITED, range: { min: 2026, max: 2026, current: 2026 } });
      await type('field-name', 'Renamed Department');

      expect(optionsOf('field-applies-from')).toEqual([2026, 2027]);
      expect(fixture.componentInstance.appliesFromYear()).toBe(2026);

      (q('field-backdate') as HTMLInputElement).click();
      await settle();
      expect(optionsOf('field-applies-from')).toEqual([2026, 2027]);
    });

    it('a wide module offers min..max with Back-date and current..max without it (D-ORG-20)', async () => {
      await mount({ row: EDITED, range: { min: 2024, max: 2029, current: 2026 } });
      await type('field-name', 'Renamed Department');

      expect(optionsOf('field-applies-from')).toEqual([2026, 2027, 2028, 2029]);
      (q('field-backdate') as HTMLInputElement).click();
      await settle();
      expect(optionsOf('field-applies-from')).toEqual([2024, 2025, 2026, 2027, 2028, 2029]);
    });

    it('un-ticking Back-date locks the earlier years again and resets the year', async () => {
      await mount({ row: EDITED });
      await type('field-name', 'Renamed Department');
      (q('field-backdate') as HTMLInputElement).click();
      await settle();
      await choose('field-applies-from', 2025);

      (q('field-backdate') as HTMLInputElement).click();
      await settle();

      expect(optionsOf('field-applies-from')).toEqual([2026, 2027]);
      expect(q('backdate-warning')).toBeNull();
      await clickSave();
      expect(api['PATCH_OrgStructureUnit'].mock.calls[0][1]).toMatchObject({ appliesFromYear: 2026 });
      expect('backdate' in api['PATCH_OrgStructureUnit'].mock.calls[0][1]).toBe(false);
    });
  });

  describe('save result toast (R-ORG-013 AC.2)', () => {
    const lastToast = () => toast.mock.calls[toast.mock.calls.length - 1][0];

    const outcome = (action: string | null, appliesFromYear: number | null, backdated = false) =>
      api['PATCH_OrgStructureUnit'].mockResolvedValue(ok({ id: 7, outcome: { action, appliesFromYear, backdated } }));
    const rename = async (r: OrgYearViewRow = EDITED) => {
      await mount({ row: r });
      await type('field-name', 'Renamed Department');
    };

    it('updated in place when the server edited a version in place', async () => {
      outcome('edit_in_place', 2026);
      await rename();

      await clickSave();

      expect(lastToast()).toMatchObject({ severity: 'success', detail: 'Entry updated in place' });
    });

    it('new version from Y when the server split a version', async () => {
      outcome('new_version', 2027);
      await rename();
      await choose('field-applies-from', 2027);

      await clickSave();

      expect(api['PATCH_OrgStructureUnit']).toHaveBeenCalledWith(7, { name: 'Renamed Department', appliesFromYear: 2027 });
      expect(lastToast().detail).toBe('Entry saved as a new version from 2027');
    });

    it('back-dated from Y, and the payload carries the flag', async () => {
      outcome('new_version', 2025, true);
      await rename();
      (q('field-backdate') as HTMLInputElement).click();
      await settle();
      await choose('field-applies-from', 2025);

      await clickSave();

      expect(api['PATCH_OrgStructureUnit']).toHaveBeenCalledWith(7, { name: 'Renamed Department', appliesFromYear: 2025, backdate: true });
      expect(lastToast().detail).toBe('Entry back-dated from 2025');
    });

    // R-ORG-004 two-version entry [2026,2028) + [2028,open): the viewed version is NOT the one Y lands in.
    it('(a) viewing 2026, Applies from 2027 lands in the later version: the server edits it in place, the toast says so', async () => {
      outcome('edit_in_place', 2027);
      await rename(row({ id: 7, code: 'ORG-7', levelCode: 'L1', name: 'Editable Department', from: 2026 }));
      await choose('field-applies-from', 2027);

      await clickSave();

      expect(lastToast()).toMatchObject({ severity: 'success', detail: 'Entry updated in place' });
    });

    it('(b) viewing a version that starts in 2028, default Applies from 2026 lands in the earlier version: edited in place, the toast says so', async () => {
      outcome('edit_in_place', 2026);
      await rename(row({ id: 7, code: 'ORG-7', levelCode: 'L1', name: 'Editable Department', from: 2028 }));

      await clickSave();

      expect(lastToast()).toMatchObject({ severity: 'success', detail: 'Entry updated in place' });
    });

    it('a no-op save (action null) shows an info "No changes", not a success toast', async () => {
      outcome(null, null);
      await rename();

      await clickSave();

      expect(lastToast()).toMatchObject({ severity: 'info', detail: 'No changes' });
      expect(toast.mock.calls.some(c => c[0].severity === 'success')).toBe(false);
    });

    it.each([
      ['code_change', 'Code updated'],
      ['delegates_change', 'Delegates updated']
    ])('%s shows %s', async (action, text) => {
      outcome(action, null);
      await mount({ row: EDITED });
      await type('field-code', 'ORG-77');

      await clickSave();

      expect(lastToast()).toMatchObject({ severity: 'success', detail: text });
    });

    it('a create shows the created text and the back-dated variant', async () => {
      api['POST_OrgStructureUnit'].mockResolvedValue(ok({ id: 99, outcome: { action: 'create', appliesFromYear: 2026, backdated: false } }));
      await mount({ row: null, rows: [] });
      await type('field-name', 'First Division');
      await clickSave();
      expect(lastToast().detail).toBe('Entry created from 2026');

      api['POST_OrgStructureUnit'].mockResolvedValue(ok({ id: 99, outcome: { action: 'create', appliesFromYear: 2025, backdated: true } }));
      await clickSave();
      expect(lastToast().detail).toBe('Entry created, back-dated from 2025');
    });

    it('emits the saved id so the page can reload and reselect', async () => {
      await mount({ row: EDITED });
      const saved = jest.fn();
      fixture.componentInstance.saved.subscribe(saved);
      await type('field-code', 'ORG-77');

      await clickSave();

      expect(saved).toHaveBeenCalledWith(7);
    });

    it('a rejected save shows the server message naming the field and does not emit saved', async () => {
      api['PATCH_OrgStructureUnit'].mockResolvedValue(rejected('parent: level not allowed'));
      await mount({ row: EDITED });
      const saved = jest.fn();
      fixture.componentInstance.saved.subscribe(saved);
      await type('field-name', 'Renamed Department');

      await clickSave();

      expect(lastToast()).toMatchObject({ severity: 'error', detail: 'parent: level not allowed' });
      expect(saved).not.toHaveBeenCalled();
    });
  });

  describe('director and delegates (R-ORG-016, 017)', () => {
    it('echoes the director email read-only and marks an inactive director', async () => {
      const gone = row({ id: 8, code: 'ORG-8', levelCode: 'L1', name: 'Gone Boss', director: staff('Z9', 'Zed Gone', false) });
      await mount({ row: gone });

      const email = q('director-email') as HTMLInputElement;
      expect(email.value).toBe('Z9@example.org');
      expect(email.readOnly).toBe(true);
      expect(q('director-inactive')?.textContent).toContain('Inactive staff');
    });

    it('picking a director sends only the carnet, and the echo follows the pick (transition)', async () => {
      api['GET_OrgStaff'].mockResolvedValue(ok([person('N1', 'Nora New')]));
      await mount({ row: EDITED });

      const found = await search('field-director', 'nor');
      await pick('field-director', found[0]);
      expect((q('director-email') as HTMLInputElement).value).toBe('N1@example.org');
      await clickSave();

      expect(api['GET_OrgStaff']).toHaveBeenCalledWith('nor');
      expect(api['PATCH_OrgStructureUnit']).toHaveBeenCalledWith(7, { directorCarnet: 'N1', appliesFromYear: 2026 });
    });

    it('does not search below two characters', async () => {
      await mount({ row: EDITED });

      expect(await search('field-director', 'n')).toEqual([]);
      expect(api['GET_OrgStaff']).not.toHaveBeenCalled();
    });

    it('the payload carries directorCarnet and delegateCarnets only: no names, no emails', async () => {
      api['GET_OrgStaff'].mockResolvedValue(ok([person('N1', 'Nora New'), person('N2', 'Nico New')]));
      await mount({ row: null, rows: [], prefill: null });
      await type('field-name', 'Brand New');
      const directors = await search('field-director', 'no');
      await pick('field-director', directors[0]);
      const delegates = await search('field-delegates', 'ni');
      await pickDelegate(delegates.find(d => d.carnet === 'N2') as OrgStaffOption);

      await clickSave();

      const body = api['POST_OrgStructureUnit'].mock.calls[0][0];
      expect(body.directorCarnet).toBe('N1');
      expect(body.delegateCarnets).toEqual(['N2']);
      const wire = JSON.stringify(body);
      expect(wire).not.toMatch(/Nora|Nico|example\.org|directorName|directorEmail|"email"|"name":"N/);
      expect(Object.keys(body).sort()).toEqual(['appliesFromYear', 'code', 'delegateCarnets', 'directorCarnet', 'levelId', 'name']);
    });

    it('does not offer the current director as a delegate, nor a person already chosen', async () => {
      api['GET_OrgStaff'].mockResolvedValue(ok([person('A1', 'Ana Director'), person('B1', 'Beto Delegate'), person('N2', 'Nico New')]));
      await mount({ row: EDITED });

      const offered = await search('field-delegates', 'an');

      expect(offered.map(o => o.carnet)).toEqual(['N2']);
    });

    it('the picker list excludes an inactive staff member', async () => {
      api['GET_OrgStaff'].mockResolvedValue(ok([{ ...person('X1', 'Xena Left'), isActiveStaff: false }, person('N2', 'Nico New')]));
      await mount({ row: EDITED });

      expect((await search('field-director', 'xe')).map(o => o.carnet)).toEqual(['N2']);
      expect((await search('field-delegates', 'xe')).map(o => o.carnet)).toEqual(['N2']);
    });

    it('a delegates-only edit does not show Applies from year and sends only delegateCarnets', async () => {
      api['GET_OrgStaff'].mockResolvedValue(ok([person('N2', 'Nico New')]));
      await mount({ row: EDITED });
      const offered = await search('field-delegates', 'ni');

      await pickDelegate(offered[0]);

      expect(q('applies-from-group')).toBeNull();
      await clickSave();
      expect(api['PATCH_OrgStructureUnit']).toHaveBeenCalledWith(7, { delegateCarnets: ['B1', 'B2', 'N2'] });
    });

    // Adapted (T-09): reordering is no longer possible with chips; the set comparison is now proven by
    // removing a delegate and picking the same person again (the order changes, the set does not).
    it('removing a delegate and picking the same person again is not a change: Save stays disabled', async () => {
      api['GET_OrgStaff'].mockResolvedValue(ok([person('B1', 'Beto Delegate')]));
      await mount({ row: EDITED });
      const saveDisabled = () => q('save-button')?.querySelector('button')?.hasAttribute('disabled');

      removeBtn('Beto Delegate').click();
      await settle();
      expect(saveDisabled()).toBe(false);
      const offered = await search('field-delegates', 'be');
      await pickDelegate(offered[0]);

      expect(fixture.componentInstance.delegates().map(d => d.carnet)).toEqual(['B2', 'B1']);
      expect(saveDisabled()).toBe(true);
    });

    it('clearing every delegate sends an empty list (replace semantics)', async () => {
      await mount({ row: EDITED });

      removeBtn('Beto Delegate').click();
      await settle();
      removeBtn('Cira Gone').click();
      await settle();
      await clickSave();

      expect(api['PATCH_OrgStructureUnit']).toHaveBeenCalledWith(7, { delegateCarnets: [] });
    });

    it('shows the Inactive staff mark on an already-stored delegate and the not-tied-to-a-year hint', async () => {
      await mount({ row: EDITED });

      expect(q('delegates-hint')?.textContent).toContain('not tied to a year');
      expect(root().querySelectorAll('[data-testid="delegate-inactive"]')).toHaveLength(1);
      expect(q('delegate-inactive')?.closest('[data-testid="delegate-chip"]')?.textContent).toContain('Cira Gone');
    });

    // T-08 / D-ORG-21 — Keywords-style chips: name inline, email only as the hover tooltip.
    const chipEls = () => fixture.debugElement.queryAll(By.css('[data-testid="delegate-chip"]'));
    const chipOf = (name: string) => chipEls().find(c => (c.nativeElement.textContent ?? '').includes(name));
    const removeBtn = (name: string) => q('delegate-chips')?.querySelector(`[aria-label="Remove ${name}"]`) as HTMLButtonElement;
    const searchInput = () => q('field-delegates')?.querySelector('input') as HTMLInputElement;

    it('a delegate chip shows the name, not the email, and carries the email as its tooltip text', async () => {
      await mount({ row: EDITED });

      const beto = chipOf('Beto Delegate');
      const cira = chipOf('Cira Gone');
      expect(beto?.nativeElement.textContent).not.toContain('B1@example.org');
      expect(cira?.nativeElement.textContent).not.toContain('B2@example.org');
      expect(beto?.injector.get(Tooltip).content).toBe('B1@example.org');
      expect(cira?.injector.get(Tooltip).content).toBe('B2@example.org');
    });

    it('hovering a chip renders the email in the tooltip', async () => {
      await mount({ row: EDITED });

      chipOf('Beto Delegate')?.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));
      await settle();
      await new Promise<void>(resolve => setTimeout(resolve, 10));

      expect(document.body.querySelector('.p-tooltip')?.textContent).toContain('B1@example.org');
    });

    // Adapted (T-09 / D-ORG-22): the global keywords-autocomplete container is gone; the chips are
    // p-chip elements in a row that follows the search field in the DOM, outside the control.
    it('the delegates field no longer carries keywords-autocomplete and the chips render below the search field', async () => {
      await mount({ row: EDITED });

      const container = q('delegates-container') as HTMLElement;
      expect(root().querySelector('.keywords-autocomplete')).toBeNull();
      const search = container.querySelector('p-autocomplete, p-autoComplete') as HTMLElement;
      const chips = q('delegate-chips') as HTMLElement;
      expect(search).toBeTruthy();
      expect(search.contains(chips)).toBe(false);
      expect(search.compareDocumentPosition(chips) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(chips.querySelectorAll('p-chip')).toHaveLength(2);
      expect(search.querySelector('p-chip, .p-autocomplete-chip')).toBeNull();
    });

    it('a delegate picked after mount renders as a chip below the field and the search input is empty (transition)', async () => {
      api['GET_OrgStaff'].mockResolvedValue(ok([person('D9', 'Dina New')]));
      await mount({ row: EDITED });
      expect(chipOf('Dina New')).toBeUndefined();

      await type('field-delegates', 'di');
      const offered = await search('field-delegates', 'di');
      await pickDelegate(offered[0]);

      expect(chipOf('Dina New')?.injector.get(Tooltip).content).toBe('D9@example.org');
      expect(searchInput().value).toBe('');
    });

    it('clicking the chip remove icon removes that delegate', async () => {
      await mount({ row: EDITED });
      expect(chipOf('Beto Delegate')).toBeTruthy();

      removeBtn('Beto Delegate').click();
      await settle();

      expect(chipOf('Beto Delegate')).toBeUndefined();
      expect(chipOf('Cira Gone')).toBeTruthy();
      expect(fixture.componentInstance.delegates().map(d => d.carnet)).toEqual(['B2']);
    });

    it('a chip exposes "name, email" as its accessible name, plus "inactive staff" when it applies', async () => {
      await mount({ row: EDITED });

      expect(chipOf('Beto Delegate')?.nativeElement.getAttribute('aria-label')).toBe('Beto Delegate, B1@example.org');
      expect(chipOf('Cira Gone')?.nativeElement.getAttribute('aria-label')).toBe('Cira Gone, B2@example.org, inactive staff');
      expect(removeBtn('Beto Delegate').getAttribute('aria-label')).toBe('Remove Beto Delegate');
    });

    it('refuses the 21st delegate: the list stays at 20 and the limit message shows', async () => {
      const twenty = Array.from({ length: 20 }, (_, i) => person(`D${i}`, `Delegate ${i}`));
      const many = row({ id: 9, code: 'ORG-9', levelCode: 'L1', name: 'Crowded', delegates: twenty.map(p => staff(p.carnet, p.name as string)) });
      await mount({ row: many });
      expect(q('delegates-limit')).toBeNull();

      await pickDelegate(person('D20', 'Delegate 20'));

      expect(fixture.componentInstance.delegates()).toHaveLength(20);
      expect(searchInput().value).toBe('');
      expect(fixture.componentInstance.delegates().some(d => d.carnet === 'D20')).toBe(false);
      expect(q('delegates-limit')).toBeTruthy();
    });
  });

  it('Cancel emits cancelled and calls no write', async () => {
    await mount({ row: EDITED });
    const cancelled = jest.fn();
    fixture.componentInstance.cancelled.subscribe(cancelled);

    (q('cancel-button')?.querySelector('button') as HTMLButtonElement).click();

    expect(cancelled).toHaveBeenCalled();
    expect(api['PATCH_OrgStructureUnit']).not.toHaveBeenCalled();
    expect(api['POST_OrgStructureUnit']).not.toHaveBeenCalled();
  });

  it('Save is disabled until something changed on an existing entry', async () => {
    await mount({ row: EDITED });
    const saveDisabled = () => q('save-button')?.querySelector('button')?.hasAttribute('disabled');
    expect(saveDisabled()).toBe(true);

    await type('field-acronym', 'EDX');

    expect(saveDisabled()).toBe(false);
  });
});
