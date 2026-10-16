import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Select } from 'primeng/select';
import OrganizationalStructureComponent from './organizational-structure.component';
import { OrgYearRange, OrgYearViewRow } from '@shared/interfaces/org-structure.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import * as xlsxExportUtil from '@shared/utils/xlsx-export.util';
import { row, staff } from '../../../../../../testing/org-structure.fixture';

// @akili-spec institutional-performance/organizational-structure T-01 (client half) — R-ORG-001,
// R-ORG-006, R-ORG-013 (AC.2, AC.3), R-ORG-014, NFR-ORG-005. The page is rendered with the REAL
// `DataTable` and `org-tree` so every assertion reads the rendered DOM (KZ-001). KZ-015: each state
// is reached by the transition the product performs (load -> year change, load -> error -> Retry).

const ok = <T>(data: T): MainResponse<T> =>
  ({ data, status: 200, description: 'ok', timestamp: '', path: '', successfulRequest: true }) as MainResponse<T>;
const failed = <T>(): MainResponse<T> =>
  ({ data: undefined, status: 500, description: 'boom', timestamp: '', path: '', successfulRequest: false }) as unknown as MainResponse<T>;

const RANGE: OrgYearRange = { min: 2025, max: 2027, current: 2026 };

// Rows come back out of natural order on purpose: ORG-10 first, ORG-2 second.
const ROWS_2026: OrgYearViewRow[] = [
  row({ id: 10, code: 'ORG-10', levelCode: 'L1', name: 'Division Ten', director: staff('C1', 'Ana Director') }),
  row({
    id: 2,
    code: 'ORG-2',
    levelCode: 'L2',
    name: 'Data Department',
    parentId: 10,
    parentCode: 'ORG-10',
    parentName: 'Division Ten',
    director: staff('C2', 'Beto Gone', false),
    delegates: [staff('C3', 'Cira Delegate'), staff('C4', 'Dario Delegate')]
  })
];
const ROWS_2025: OrgYearViewRow[] = [row({ id: 77, code: 'ORG-77', levelCode: 'L1', name: 'Old Division', from: 2025 })];

describe('OrganizationalStructureComponent', () => {
  let fixture: ComponentFixture<OrganizationalStructureComponent>;
  let component: OrganizationalStructureComponent;
  let api: {
    GET_OrgStructureYears: jest.Mock;
    GET_OrgStructureUnits: jest.Mock;
    GET_ControlListValuesByKey: jest.Mock;
    [method: string]: jest.Mock;
  };

  const root = () => fixture.nativeElement as HTMLElement;
  const q = (testId: string) => root().querySelector(`[data-testid="${testId}"]`) as HTMLElement | null;
  const innerButton = (testId: string) => q(testId)?.querySelector('button') as HTMLButtonElement;
  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  function mount() {
    fixture = TestBed.createComponent(OrganizationalStructureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return settle();
  }

  async function create(range: OrgYearRange = RANGE, rows: OrgYearViewRow[] = ROWS_2026) {
    api.GET_OrgStructureYears.mockResolvedValue(ok(range));
    api.GET_OrgStructureUnits.mockImplementation((year: number) => Promise.resolve(ok(year === 2025 ? ROWS_2025 : rows)));
    await mount();
  }

  const chooseYear = async (year: number) => {
    fixture.debugElement.query(By.directive(Select)).triggerEventHandler('onChange', { value: year });
    await settle();
  };
  const openView = async (view: 'tree' | 'table') => {
    (q(`view-${view}`) as HTMLButtonElement).click();
    await settle();
  };
  const codeCells = () => Array.from(root().querySelectorAll('[data-testid="cell-code"]')).map(c => c.textContent?.trim());

  beforeEach(async () => {
    api = {
      GET_OrgStructureYears: jest.fn(),
      GET_OrgStructureUnits: jest.fn(),
      GET_OrgStructureCodeProposal: jest.fn().mockResolvedValue(ok({ code: 'ORG-118' })),
      GET_OrgStaff: jest.fn().mockResolvedValue(ok([])),
      GET_ControlListValuesByKey: jest.fn().mockResolvedValue(ok([])),
      POST_OrgStructureUnit: jest.fn().mockResolvedValue(ok({ id: 99 })),
      PATCH_OrgStructureUnit: jest.fn().mockResolvedValue(ok({ id: 2 }))
    };
    await TestBed.configureTestingModule({
      imports: [OrganizationalStructureComponent],
      providers: [provideNoopAnimations(), { provide: ApiService, useValue: api }, { provide: ActionsService, useValue: { showToast: jest.fn() } }]
    }).compileComponents();
  });

  describe('load and year', () => {
    it('defaults the year to B2 `current` and loads B1 once for it', async () => {
      await create();

      expect(api.GET_OrgStructureYears).toHaveBeenCalledTimes(1);
      expect(api.GET_OrgStructureUnits).toHaveBeenCalledTimes(1);
      expect(api.GET_OrgStructureUnits).toHaveBeenCalledWith(2026, false);
      expect(component.year()).toBe(2026);
      expect(component.yearOptions()).toEqual([2025, 2026, 2027]);
    });

    it('a year change calls B1 once with the new year and reloads BOTH views (AC.3)', async () => {
      await create();
      expect(root().querySelector('app-org-tree')).toBeTruthy();
      expect(root().textContent).toContain('Division Ten');
      api.GET_OrgStructureUnits.mockClear();

      await chooseYear(2025);

      expect(api.GET_OrgStructureUnits).toHaveBeenCalledTimes(1);
      expect(api.GET_OrgStructureUnits).toHaveBeenCalledWith(2025, false);
      expect(root().textContent).toContain('Old Division');
      expect(root().textContent).not.toContain('Division Ten');

      await openView('table');
      expect(codeCells()).toEqual(['ORG-77']);

      await chooseYear(2026);
      expect(codeCells()).toEqual(['ORG-2', 'ORG-10']);
      await openView('tree');
      expect(root().textContent).toContain('Division Ten');
      expect(root().textContent).not.toContain('Old Division');
    });

    it('Show inactive / deleted reloads B1 with includeEnded', async () => {
      await create();
      api.GET_OrgStructureUnits.mockClear();

      const box = q('include-ended') as HTMLInputElement;
      box.checked = true;
      box.dispatchEvent(new Event('change'));
      await settle();

      expect(api.GET_OrgStructureUnits).toHaveBeenCalledTimes(1);
      expect(api.GET_OrgStructureUnits).toHaveBeenCalledWith(2026, true);
    });

    it('shows the count chips of the chosen year', async () => {
      await create();

      expect(q('chip-L1')?.textContent).toContain('1 Divisions');
      expect(q('chip-L2')?.textContent).toContain('1 Departments');
      expect(q('chip-L3')?.textContent).toContain('0 Offices');
      expect(q('chip-L4')?.textContent).toContain('0 Units');
    });
  });

  describe('R-ORG-001 no portfolio selector', () => {
    it('renders no portfolio control, label or option anywhere (by role and by label)', async () => {
      await create();

      const controls = Array.from(root().querySelectorAll('select, [role="combobox"], [role="listbox"], label, [aria-label]'));
      const names = controls.map(el => `${el.getAttribute('aria-label') ?? ''} ${el.tagName === 'LABEL' ? el.textContent : ''}`.trim());
      expect(names.some(n => /portfolio/i.test(n))).toBe(false);
      // The only select on the page is the Structure year one.
      expect(fixture.debugElement.queryAll(By.directive(Select))).toHaveLength(1);
      expect(root().querySelector('label[for="orgStructureYear"]')?.textContent).toContain('Structure year');
      expect(root().textContent).not.toMatch(/portfolio/i);
    });
  });

  describe('R-ORG-013 AC.2 UI states, in both views', () => {
    it('shows the progress bar while B1 is pending, in both views', async () => {
      api.GET_OrgStructureYears.mockResolvedValue(ok(RANGE));
      let release: (value: MainResponse<OrgYearViewRow[]>) => void = () => undefined;
      api.GET_OrgStructureUnits.mockReturnValue(new Promise(resolve => (release = resolve)));
      await mount();

      expect(root().querySelector('app-custom-progress-bar')).toBeTruthy();
      await openView('table');
      expect(root().querySelector('app-custom-progress-bar')).toBeTruthy();

      release(ok(ROWS_2026));
      await settle();
      expect(root().querySelector('app-custom-progress-bar')).toBeNull();
      expect(codeCells()).toEqual(['ORG-2', 'ORG-10']);
    });

    it('module empty: the empty state offers + New entry, in both views', async () => {
      await create({ min: 2026, max: 2026, current: 2026 }, []);

      expect(q('empty-state')).toBeTruthy();
      expect(q('empty-year-state')).toBeNull();
      expect(q('empty-new-entry-button')?.textContent).toContain('New entry');
      await openView('table');
      expect(q('empty-state')).toBeTruthy();

      innerButton('empty-new-entry-button').click();
      await settle();
      expect(q('org-unit-form')).toBeTruthy();
    });

    it('year empty: the message names the year, in both views', async () => {
      await create(RANGE, []);

      expect(q('empty-year-state')?.textContent).toContain('No entries in 2026');
      expect(q('empty-state')).toBeNull();
      await openView('table');
      expect(q('empty-year-state')?.textContent).toContain('No entries in 2026');
    });

    it('error shows an inline message with Retry in both views; Retry calls B1 again and recovers', async () => {
      api.GET_OrgStructureYears.mockResolvedValue(ok(RANGE));
      api.GET_OrgStructureUnits.mockResolvedValueOnce(failed());
      await mount();

      expect(q('error-state')).toBeTruthy();
      await openView('table');
      expect(q('error-state')).toBeTruthy();
      expect(api.GET_OrgStructureUnits).toHaveBeenCalledTimes(1);

      api.GET_OrgStructureUnits.mockResolvedValue(ok(ROWS_2026));
      innerButton('retry-button').click();
      await settle();

      expect(api.GET_OrgStructureUnits).toHaveBeenCalledTimes(2);
      expect(api.GET_OrgStructureYears).toHaveBeenCalledTimes(1);
      expect(q('error-state')).toBeNull();
      expect(codeCells()).toEqual(['ORG-2', 'ORG-10']);
    });

    it('a failed B2 also lands in the error state, and Retry reloads B2', async () => {
      api.GET_OrgStructureYears.mockResolvedValueOnce(failed());
      await mount();
      expect(q('error-state')).toBeTruthy();

      api.GET_OrgStructureYears.mockResolvedValue(ok(RANGE));
      api.GET_OrgStructureUnits.mockResolvedValue(ok(ROWS_2026));
      innerButton('retry-button').click();
      await settle();

      expect(api.GET_OrgStructureYears).toHaveBeenCalledTimes(2);
      expect(q('error-state')).toBeNull();
      expect(component.year()).toBe(2026);
    });
  });

  describe('table view (R-ORG-014)', () => {
    it('defaults to natural code order: ORG-2 before ORG-10', async () => {
      await create();
      await openView('table');

      expect(codeCells()).toEqual(['ORG-2', 'ORG-10']);
    });

    it('shows the Delegates column labelled current, with the joined names and the Inactive staff mark', async () => {
      await create();
      await openView('table');

      expect(q('column-header-delegates')?.textContent).toContain('Delegates (current)');
      expect(q('cell-delegates')?.textContent).toContain('Cira Delegate; Dario Delegate');
      expect(q('cell-director')?.textContent).toContain('Beto Gone (Inactive staff)');
    });

    it('exports exactly the filtered and sorted rows, and the file name carries the year', async () => {
      await create();
      await openView('table');
      const exportSpy = jest.spyOn(xlsxExportUtil, 'exportRowsToXlsx').mockResolvedValue(undefined);
      const search = q('data-table-search') as HTMLInputElement;
      search.value = 'data';
      search.dispatchEvent(new Event('input'));
      await settle();

      (q('data-table-export') as HTMLButtonElement).click();
      await settle();

      expect(exportSpy).toHaveBeenCalledTimes(1);
      const [arg] = exportSpy.mock.calls[0];
      expect(arg.rows.map(r => (r as { code: string }).code)).toEqual(['ORG-2']);
      expect(arg.fileName).toBe('organizational-structure_2026.xlsx');
      exportSpy.mockRestore();
    });

    it('exports a past year under that year in the name', async () => {
      await create();
      await chooseYear(2025);
      await openView('table');
      const exportSpy = jest.spyOn(xlsxExportUtil, 'exportRowsToXlsx').mockResolvedValue(undefined);

      (q('data-table-export') as HTMLButtonElement).click();
      await settle();

      expect(exportSpy.mock.calls[0][0].fileName).toContain('2025');
      expect(exportSpy.mock.calls[0][0].rows.map(r => (r as { code: string }).code)).toEqual(['ORG-77']);
      exportSpy.mockRestore();
    });
  });

  describe('tree view', () => {
    it('renders expanders with an aria-label and nests children under the expanded division', async () => {
      await create();

      const togglers = Array.from(root().querySelectorAll('button[data-testid="org-tree-toggle"]')) as HTMLButtonElement[];
      // The expanded division reads Collapse; the childless department's toggle is hidden from assistive tech.
      expect(togglers.map(t => t.getAttribute('aria-label'))).toEqual(['Collapse Division Ten', 'Expand Data Department']);
      expect(togglers.map(t => t.getAttribute('aria-hidden'))).toEqual([null, 'true']);
      expect(Array.from(root().querySelectorAll('[data-testid="org-tree-name"]')).map(n => n.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
        'Division Ten',
        'Data Department'
      ]);
      expect(root().querySelector('[data-testid="org-tree-count"]')?.textContent).toContain('1 units');
    });

    it('names the expander by its state: a collapsed L2 with children reads Expand, then Collapse after a click (KZ-015)', async () => {
      const withChild = [
        ...ROWS_2026,
        row({ id: 5, code: 'ORG-5', levelCode: 'L4', name: 'Child Unit', parentId: 2, parentCode: 'ORG-2', parentName: 'Data Department' })
      ];
      await create(RANGE, withChild);
      const rowFor = (name: string) =>
        (Array.from(root().querySelectorAll('[data-testid="org-tree-row"]')) as HTMLElement[]).find(r => r.textContent?.includes(name));
      const expander = () => rowFor('Data Department')?.querySelector('td button') as HTMLButtonElement;

      // Arranged transition: the L2 starts collapsed (only L1 is expanded), so its child is not rendered.
      expect(rowFor('Child Unit')).toBeUndefined();
      expect(expander().getAttribute('aria-label')).toBe('Expand Data Department');
      expect(expander().getAttribute('aria-expanded')).toBe('false');

      expander().click();
      await settle();

      expect(rowFor('Child Unit')).toBeTruthy();
      expect(expander().getAttribute('aria-label')).toBe('Collapse Data Department');
      expect(expander().getAttribute('aria-expanded')).toBe('true');

      expander().click();
      await settle();
      expect(rowFor('Child Unit')).toBeUndefined();
      expect(expander().getAttribute('aria-label')).toBe('Expand Data Department');
    });

    it('marks an inactive director on the tree row', async () => {
      await create();

      expect(root().querySelectorAll('[data-testid="inactive-staff-badge"]')).toHaveLength(1);
    });

    it('selecting a row fills the right panel; the toggle keeps the selection', async () => {
      await create();
      expect(q('detail-empty')).toBeTruthy();

      (root().querySelectorAll('[data-testid="org-tree-row"]')[1] as HTMLElement).click();
      await settle();
      expect(q('selected-summary')?.textContent).toContain('ORG-2');

      await openView('table');
      expect(q('selected-summary')?.textContent).toContain('ORG-2');
    });

    it('+ New entry opens the empty form in the right panel', async () => {
      await create();

      innerButton('new-entry-button').click();
      await settle();

      expect(q('org-unit-form')).toBeTruthy();
    });
    it('row + pre-fills the parent and the next level, and is hidden on a Unit and on an ended entry (design §6.3)', async () => {
      const rows = [
        row({ id: 10, code: 'ORG-10', levelCode: 'L1', name: 'Division Ten' }),
        row({ id: 2, code: 'ORG-2', levelCode: 'L2', name: 'Data Department', parentId: 10, parentCode: 'ORG-10', parentName: 'Division Ten' }),
        row({ id: 5, code: 'ORG-5', levelCode: 'L4', name: 'Child Unit', parentId: 2, parentCode: 'ORG-2', parentName: 'Data Department' }),
        row({ id: 6, code: 'ORG-6', levelCode: 'L2', name: 'Gone Department', parentId: 10, status: 'inactive', statusFromYear: 2026 })
      ];
      api.GET_ControlListValuesByKey.mockResolvedValue(
        ok([
          { id: 20, value: 'Division' },
          { id: 21, value: 'Department' },
          { id: 22, value: 'Office' },
          { id: 23, value: 'Unit' }
        ])
      );
      await create(RANGE, rows);
      (root().querySelector('[data-testid="include-ended"]') as HTMLInputElement).click();
      await settle();
      const rowFor = (name: string) =>
        (Array.from(root().querySelectorAll('[data-testid="org-tree-row"]')) as HTMLElement[]).find(r => r.textContent?.includes(name));
      // Expand the L1 and L2 so the L2 and L4 rows are rendered.
      const expandAll = async () => {
        for (let i = 0; i < 3; i++) {
          (root().querySelectorAll('[data-testid="org-tree-toggle"]') as NodeListOf<HTMLElement>).forEach(t => {
            if (t.getAttribute('aria-expanded') === 'false' && t.style.visibility !== 'hidden') t.click();
          });
          await settle();
        }
      };
      await expandAll();

      expect(rowFor('Child Unit')?.querySelector('[data-testid="org-tree-add"]')).toBeNull();
      expect(rowFor('Gone Department')?.querySelector('[data-testid="org-tree-add"]')).toBeNull();

      (rowFor('Division Ten')?.querySelector('[data-testid="org-tree-add"]') as HTMLButtonElement).click();
      await settle();

      expect(q('org-unit-form')).toBeTruthy();
      expect(component.prefill()).toEqual({ parentId: 10, levelId: 21 });
      expect(root().textContent).toContain('L2 Department');
    });

    it('after a save B2 and B1 are reloaded so the new year becomes selectable (T-01 advisory)', async () => {
      await create(RANGE, ROWS_2026);
      (root().querySelectorAll('[data-testid="org-tree-row"]')[1] as HTMLElement).click();
      await settle();
      api.GET_OrgStructureYears.mockResolvedValue(ok({ min: 2025, max: 2028, current: 2026 }));
      api.GET_OrgStructureYears.mockClear();
      api.GET_OrgStructureUnits.mockClear();

      await component.onSaved(2);
      await settle();

      expect(api.GET_OrgStructureYears).toHaveBeenCalledTimes(1);
      expect(api.GET_OrgStructureUnits).toHaveBeenCalledTimes(1);
      expect(component.yearOptions()).toEqual([2025, 2026, 2027, 2028]);
      expect(component.year()).toBe(2026);
      expect(component.selectedId()).toBe(2);
    });
  });
});
