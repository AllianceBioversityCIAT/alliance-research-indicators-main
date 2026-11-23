import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { OrgUnitPanelComponent } from './org-unit-panel.component';
import { OrgLifecycleDone } from '../org-lifecycle-dialog/org-lifecycle-dialog.component';
import { OrgChangeLogRow, OrgHistory, OrgLinkedData, OrgYearRange, OrgYearViewRow } from '@shared/interfaces/org-structure.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import { row, staff } from '../../../../../../../../testing/org-structure.fixture';

// @akili-spec institutional-performance/organizational-structure T-03 (client half) — R-ORG-008, 009,
// 013, 017. Real form, real dialog, real `app-modal`; every assertion reads the rendered DOM (KZ-001).
// KZ-015: the History tab is reached by clicking it, a different entry by changing the input the page
// changes. KZ-017: the page-level reload after an action is covered in the page spec, not here.

const ok = <T>(data: T): MainResponse<T> =>
  ({ data, status: 200, description: 'ok', timestamp: '', path: '', successfulRequest: true }) as MainResponse<T>;
const failed = (): MainResponse<unknown> =>
  ({ data: undefined, status: 500, description: 'boom', timestamp: '', path: '', successfulRequest: false }) as MainResponse<unknown>;

const RANGE: OrgYearRange = { min: 2025, max: 2028, current: 2027 };
const DIVISION = row({ id: 1, code: 'ORG-1', levelCode: 'L1', name: 'Division One' });
const DEPARTMENT = row({
  delegates: [staff('B2002', 'Marta Ruiz')],
  id: 2,
  code: 'ORG-2',
  levelCode: 'L2',
  name: 'Data Department',
  parentId: 1,
  parentCode: 'ORG-1',
  parentName: 'Division One'
});
const UNIT = row({
  id: 5,
  code: 'ORG-5',
  levelCode: 'L4',
  name: 'Unit Five',
  parentId: 2,
  parentCode: 'ORG-2',
  parentName: 'Data Department',
  director: staff('A1', 'Ana Director')
});
const INACTIVE = row({ id: 6, code: 'ORG-6', levelCode: 'L4', name: 'Sleeping Unit', parentId: 2, status: 'inactive', statusFromYear: 2027 });
const DELETED = row({ id: 7, code: 'ORG-7', levelCode: 'L4', name: 'Removed Unit', parentId: 2, status: 'deleted', statusFromYear: 2027 });
const ROWS = [DIVISION, DEPARTMENT, UNIT, INACTIVE, DELETED];

const log = (id: number, o: Partial<OrgChangeLogRow>): OrgChangeLogRow => ({
  id,
  unitId: 5,
  action: 'edit_in_place',
  appliesFromYear: 2027,
  backdated: false,
  createdAt: '2027-03-01T10:00:00.000Z',
  changes: {},
  createdBy: { id: 1, name: 'Admin One', email: 'one@example.org' },
  ...o
});

// Newest first, as B6 returns it.
const HISTORY: OrgHistory = {
  versions: [
    { ...UNIT.version, from: 2026, to: 2028, name: 'Unit Five (old)', delegates: [staff('B3001', 'Olga Old')] },
    { ...UNIT.version, from: 2028, to: null, delegates: [staff('B3002', 'Nora New'), staff('B3003', 'Pablo Plus')] }
  ],
  log: [
    log(3, {
      action: 'delegates_change',
      appliesFromYear: null,
      createdAt: '2027-05-02T09:15:00.000Z',
      createdBy: { id: 2, name: 'Beatriz Admin', email: null },
      changes: { delegates: { old: ['B2001'], new: ['B2002'] } }
    }),
    log(2, {
      action: 'new_version',
      backdated: true,
      appliesFromYear: 2026,
      createdAt: '2027-04-01T09:00:00.000Z',
      changes: { name: { old: 'Unit Five (old)', new: 'Unit Five' } }
    }),
    log(1, { action: 'create', createdAt: '2027-01-10T08:00:00.000Z', changes: {} })
  ]
};

const LINKED: OrgLinkedData = {
  childCount: 3,
  consumers: [
    { consumer: 'Organizational Structure › Level', count: 2 },
    { consumer: 'KPI Results', count: 0 }
  ]
};

describe('OrgUnitPanelComponent', () => {
  let fixture: ComponentFixture<OrgUnitPanelComponent>;
  let api: Record<string, jest.Mock>;
  let lifecycle: OrgLifecycleDone[];

  const root = () => fixture.nativeElement as HTMLElement;
  const q = (testId: string) => document.body.querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
  const all = (testId: string) => Array.from(document.body.querySelectorAll(`[data-testid="${testId}"]`)) as HTMLElement[];
  const inner = (testId: string) => q(testId)?.querySelector('button') as HTMLButtonElement;
  const settle = async () => {
    for (let i = 0; i < 3; i++) {
      await fixture.whenStable();
      fixture.detectChanges();
    }
  };
  const openLinked = async () => {
    (q('tab-linked') as HTMLButtonElement).click();
    await settle();
  };
  const openHistory = async () => {
    (q('tab-history') as HTMLButtonElement).click();
    await settle();
  };

  async function mount(selected: OrgYearViewRow | null, extra: { creating?: boolean } = {}) {
    fixture = TestBed.createComponent(OrgUnitPanelComponent);
    fixture.componentRef.setInput('row', selected);
    fixture.componentRef.setInput('rows', ROWS);
    fixture.componentRef.setInput('range', RANGE);
    fixture.componentRef.setInput('creating', extra.creating ?? false);
    fixture.componentRef.setInput('formKey', `${selected?.id ?? 'new'}-1`);
    fixture.componentInstance.lifecycleDone.subscribe(d => lifecycle.push(d));
    fixture.detectChanges();
    await settle();
  }

  beforeEach(async () => {
    lifecycle = [];
    api = {
      GET_OrgStructureHistory: jest.fn().mockResolvedValue(ok(HISTORY)),
      GET_OrgStructureLinkedData: jest.fn().mockResolvedValue(ok(LINKED)),
      GET_OrgStructureUnits: jest.fn().mockResolvedValue(ok(ROWS)),
      GET_OrgStructureCodeProposal: jest.fn().mockResolvedValue(ok({ code: 'ORG-118' })),
      GET_OrgStaff: jest.fn().mockResolvedValue(ok([])),
      GET_ControlListValuesByKey: jest.fn().mockResolvedValue(ok([])),
      POST_OrgStructureInactivate: jest.fn().mockResolvedValue(ok({ id: 5 })),
      POST_OrgStructureReactivate: jest.fn().mockResolvedValue(ok({ id: 6 })),
      DELETE_OrgStructureUnit: jest.fn().mockResolvedValue(ok({ id: 5, mode: 'logical' }))
    };
    await TestBed.configureTestingModule({
      imports: [OrgUnitPanelComponent],
      providers: [
        provideNoopAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: api },
        { provide: ActionsService, useValue: { showToast: jest.fn() } }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('header and states', () => {
    it('nothing selected: the empty message; creating: the form under a New entry title and no tabs', async () => {
      await mount(null);
      expect(q('detail-empty')).toBeTruthy();
      expect(q('tab-history')).toBeNull();
      fixture.destroy();

      await mount(null, { creating: true });
      expect(q('new-entry-title')).toBeTruthy();
      expect(q('org-unit-form')).toBeTruthy();
      expect(q('tab-history')).toBeNull();
      expect(q('delete-button')).toBeNull();
    });

    it('shows code, level, name, the path as of the year and the read-only permanent ID', async () => {
      await mount(UNIT);

      expect(q('summary-code')?.textContent).toBe('ORG-5');
      expect(q('summary-level')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('L4 Unit');
      expect(q('selected-summary')?.textContent).toContain('Unit Five');
      expect(q('summary-path')?.textContent?.trim()).toBe('Division One / Data Department / Unit Five');
      expect(q('summary-id')?.textContent).toContain('Permanent ID 5');
      expect(q('summary-id')?.querySelector('input')).toBeNull();
    });
  });

  describe('actions per status', () => {
    it('an active entry offers Delete and Inactivate, and the Details form with Save', async () => {
      await mount(UNIT);

      expect(q('delete-button')).toBeTruthy();
      expect(q('inactivate-button')).toBeTruthy();
      expect(q('reactivate-button')).toBeNull();
      expect(q('save-button')).toBeTruthy();
    });

    it('an inactive entry offers Delete and Reactivate, not Inactivate; it can still be edited', async () => {
      await mount(INACTIVE);

      expect(q('delete-button')).toBeTruthy();
      expect(q('reactivate-button')).toBeTruthy();
      expect(q('inactivate-button')).toBeNull();
      expect(q('save-button')).toBeTruthy();
    });

    it('a deleted entry shows no Save, no form, no Delete, no Inactivate and no Reactivate (R-ORG-008 AC.3)', async () => {
      await mount(DELETED);

      expect(q('save-button')).toBeNull();
      expect(q('org-unit-form')).toBeNull();
      expect(q('delete-button')).toBeNull();
      expect(q('inactivate-button')).toBeNull();
      expect(q('reactivate-button')).toBeNull();
      expect(q('deleted-notice')?.textContent).toContain('deleted from 2027');
      expect(q('tab-history')).toBeTruthy();
    });

    it('a deleted entry still opens its History', async () => {
      await mount(DELETED);

      await openHistory();

      expect(api['GET_OrgStructureHistory']).toHaveBeenCalledWith(7);
      expect(all('version-row')).toHaveLength(2);
    });
  });

  describe('History tab (R-ORG-009, R-ORG-017)', () => {
    it('loads B6 on first open only, shows the versions table BEFORE the log, and the log newest first', async () => {
      await mount(UNIT);
      expect(api['GET_OrgStructureHistory']).not.toHaveBeenCalled();

      await openHistory();

      expect(api['GET_OrgStructureHistory']).toHaveBeenCalledTimes(1);
      expect(api['GET_OrgStructureHistory']).toHaveBeenCalledWith(5);
      expect(all('version-row').map(r => r.querySelector('td')?.textContent)).toEqual(['2026–2027', '2028 onwards']);
      const versions = q('history-versions') as HTMLElement;
      const timeline = q('history-log') as HTMLElement;
      expect(versions.compareDocumentPosition(timeline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(all('log-action').map(a => a.textContent?.trim())).toEqual(['Delegates changed', 'New version', 'Created']);
    });

    it('a delegates change shows its date, the user and both lists; a carnet held on screen shows as a name, an unknown one stays a carnet (R-ORG-017 History half)', async () => {
      await mount(UNIT);

      await openHistory();

      const first = all('log-entry')[0];
      expect(first.querySelector('[data-testid="log-meta"]')?.textContent).toContain('Beatriz Admin');
      expect(first.querySelector('[data-testid="log-meta"]')?.textContent).toContain('2027-05-02 09:15');
      expect(first.querySelector('[data-testid="log-diff"]')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Delegates: B2001 → Marta Ruiz');
    });

    // T-12 (D-ORG-24): delegates are listed per version, like the director.
    it("the versions table has a Delegates column holding each version's own list", async () => {
      await mount(UNIT);

      await openHistory();

      const headers = Array.from((q('history-versions') as HTMLElement).querySelectorAll('th')).map(h => h.textContent?.trim());
      expect(headers).toEqual(['Years', 'Name', 'Level', 'Parent', 'Director', 'Delegates']);
      expect(all('version-delegates').map(c => c.textContent?.trim())).toEqual(['Olga Old', 'Nora New; Pablo Plus']);
    });

    it('a delegates diff inside a new_version row shows old and new names, resolved from the versions on screen', async () => {
      api['GET_OrgStructureHistory'].mockResolvedValue(
        ok({
          versions: HISTORY.versions,
          log: [
            log(9, {
              action: 'new_version',
              appliesFromYear: 2028,
              changes: { delegates: { old: ['B3001'], new: ['B3002', 'B3003'] } }
            })
          ]
        })
      );
      await mount(UNIT);

      await openHistory();

      expect(all('log-action').map(a => a.textContent?.trim())).toEqual(['New version']);
      expect(q('log-diff')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Delegates: Olga Old → Nora New, Pablo Plus');
    });

    it('a back-dated version shows the Back-dated mark, its applies-from year and the field diff', async () => {
      await mount(UNIT);

      await openHistory();

      const second = all('log-entry')[1];
      expect(second.querySelector('[data-testid="log-backdated"]')).toBeTruthy();
      expect(second.querySelector('[data-testid="log-meta"]')?.textContent).toContain('applies from 2026');
      expect(second.querySelector('[data-testid="log-diff"]')?.textContent).toContain('Name: Unit Five (old) → Unit Five');
      expect(all('log-entry')[0].querySelector('[data-testid="log-backdated"]')).toBeNull();
    });

    it('an empty log says so; a failed B6 shows an inline error and Retry recovers', async () => {
      api['GET_OrgStructureHistory'].mockResolvedValueOnce(failed());
      await mount(UNIT);

      await openHistory();
      expect(q('history-error')).toBeTruthy();

      api['GET_OrgStructureHistory'].mockResolvedValue(ok({ versions: HISTORY.versions, log: [] }));
      inner('history-retry').click();
      await settle();

      expect(q('history-error')).toBeNull();
      expect(q('log-empty')).toBeTruthy();
    });

    it('selecting another entry returns to Details and forgets the previous history (transition)', async () => {
      await mount(UNIT);
      await openHistory();
      expect(q('panel-history')).toBeTruthy();

      fixture.componentRef.setInput('row', INACTIVE);
      fixture.componentRef.setInput('formKey', '6-2');
      fixture.detectChanges();
      await settle();

      expect(q('panel-details')).toBeTruthy();
      expect(q('panel-history')).toBeNull();
      expect(fixture.componentInstance.history()).toBeNull();
    });

    it('a History response that arrives after another entry was selected is dropped, not shown for the new entry', async () => {
      let resolveA!: (r: MainResponse<OrgHistory>) => void;
      api['GET_OrgStructureHistory'].mockReturnValueOnce(new Promise(resolve => (resolveA = resolve)));
      await mount(UNIT);
      await openHistory();

      fixture.componentRef.setInput('row', INACTIVE);
      fixture.componentRef.setInput('formKey', '6-2');
      fixture.detectChanges();
      await settle();
      resolveA(ok(HISTORY));
      await settle();
      api['GET_OrgStructureHistory'].mockReturnValueOnce(new Promise(() => undefined));
      await openHistory();

      expect(all('version-row')).toHaveLength(0);
      expect(q('history-loading')).toBeTruthy();
    });

    it('after a save (new form key) an open History reloads, so the new log row appears', async () => {
      await mount(UNIT);
      await openHistory();
      expect(api['GET_OrgStructureHistory']).toHaveBeenCalledTimes(1);

      fixture.componentRef.setInput('formKey', '5-2');
      fixture.detectChanges();
      await settle();

      expect(api['GET_OrgStructureHistory']).toHaveBeenCalledTimes(2);
    });
  });

  describe('Linked data tab (R-ORG-013, R-ORG-010 AC.2)', () => {
    it('loads B8 on first open only and renders the child count and one row per consumer', async () => {
      await mount(UNIT);
      expect(api['GET_OrgStructureLinkedData']).not.toHaveBeenCalled();

      await openLinked();

      expect(api['GET_OrgStructureLinkedData']).toHaveBeenCalledTimes(1);
      expect(api['GET_OrgStructureLinkedData']).toHaveBeenCalledWith(5);
      expect(q('linked-child-count')?.textContent?.trim()).toBe('3');
      expect(all('linked-consumer-name').map(n => n.textContent?.trim())).toEqual(['Organizational Structure › Level', 'KPI Results']);
      expect(all('linked-consumer-count').map(n => n.textContent?.trim())).toEqual(['2', '0']);
      expect(q('linked-empty')).toBeNull();
    });

    it('shows No linked data yet when the child count and every consumer count are zero', async () => {
      api['GET_OrgStructureLinkedData'].mockResolvedValue(ok({ childCount: 0, consumers: [{ consumer: 'KPI Results', count: 0 }] }));
      await mount(UNIT);

      await openLinked();

      expect(q('linked-empty')?.textContent).toContain('No linked data yet');
      expect(q('linked-table')).toBeNull();
    });

    it('a consumer count alone hides the empty state', async () => {
      api['GET_OrgStructureLinkedData'].mockResolvedValue(ok({ childCount: 0, consumers: [{ consumer: 'KPI Results', count: 4 }] }));
      await mount(UNIT);

      await openLinked();

      expect(q('linked-empty')).toBeNull();
      expect(q('linked-child-count')?.textContent?.trim()).toBe('0');
    });

    it('a child count alone hides the empty state', async () => {
      api['GET_OrgStructureLinkedData'].mockResolvedValue(ok({ childCount: 1, consumers: [] }));
      await mount(DEPARTMENT);

      await openLinked();

      expect(q('linked-empty')).toBeNull();
      expect(q('linked-child-count')?.textContent?.trim()).toBe('1');
    });

    it('a failed B8 shows an inline error and Retry recovers', async () => {
      api['GET_OrgStructureLinkedData'].mockResolvedValueOnce(failed());
      await mount(UNIT);

      await openLinked();
      expect(q('linked-error')).toBeTruthy();

      inner('linked-retry').click();
      await settle();

      expect(q('linked-error')).toBeNull();
      expect(q('linked-child-count')?.textContent?.trim()).toBe('3');
    });

    it('a deleted entry still opens its Linked data', async () => {
      await mount(DELETED);

      await openLinked();

      expect(api['GET_OrgStructureLinkedData']).toHaveBeenCalledWith(7);
      expect(q('linked-child-count')).toBeTruthy();
    });

    it('a Linked data response that arrives after another entry was selected is dropped, not shown for the new entry', async () => {
      let resolveA!: (r: MainResponse<OrgLinkedData>) => void;
      api['GET_OrgStructureLinkedData'].mockReturnValueOnce(new Promise(resolve => (resolveA = resolve)));
      await mount(UNIT);
      await openLinked();

      fixture.componentRef.setInput('row', INACTIVE);
      fixture.componentRef.setInput('formKey', '6-2');
      fixture.detectChanges();
      await settle();
      resolveA(ok(LINKED));
      await settle();
      api['GET_OrgStructureLinkedData'].mockReturnValueOnce(new Promise(() => undefined));
      await openLinked();

      expect(q('linked-child-count')).toBeNull();
      expect(q('linked-loading')).toBeTruthy();
    });

    it('after a save an open Linked data reloads; selecting another entry returns to Details and forgets it (transition)', async () => {
      await mount(UNIT);
      await openLinked();
      expect(api['GET_OrgStructureLinkedData']).toHaveBeenCalledTimes(1);

      fixture.componentRef.setInput('formKey', '5-2');
      fixture.detectChanges();
      await settle();
      expect(api['GET_OrgStructureLinkedData']).toHaveBeenCalledTimes(2);

      fixture.componentRef.setInput('row', INACTIVE);
      fixture.componentRef.setInput('formKey', '6-3');
      fixture.detectChanges();
      await settle();

      expect(q('panel-details')).toBeTruthy();
      expect(q('panel-linked')).toBeNull();
      expect(fixture.componentInstance.linked()).toBeNull();
    });
  });

  describe('lifecycle dialog', () => {
    it('Inactivate opens the dialog for that entry; Cancel closes it and nothing is sent', async () => {
      await mount(UNIT);

      inner('inactivate-button').click();
      await settle();
      expect(q('lifecycle-dialog')).toBeTruthy();
      expect(q('lifecycle-entry')?.textContent).toContain('ORG-5');

      inner('lifecycle-cancel').click();
      await settle();

      expect(q('lifecycle-dialog')).toBeNull();
      expect(api['POST_OrgStructureInactivate']).not.toHaveBeenCalled();
      expect(lifecycle).toEqual([]);
    });

    it('confirming reports the action upward and closes the dialog', async () => {
      await mount(UNIT);
      inner('inactivate-button').click();
      await settle();

      inner('lifecycle-confirm').click();
      await settle();

      expect(api['POST_OrgStructureInactivate']).toHaveBeenCalledWith(5, { fromYear: 2027 });
      expect(lifecycle).toEqual([{ action: 'inactivate', id: 5, mode: undefined }]);
      expect(q('lifecycle-dialog')).toBeNull();
    });

    it('Reactivate on an inactive entry opens the reactivate dialog', async () => {
      await mount(INACTIVE);

      inner('reactivate-button').click();
      await settle();

      expect(q('lifecycle-dialog')?.getAttribute('aria-label')).toBe('Reactivate entry');
    });
  });
});
