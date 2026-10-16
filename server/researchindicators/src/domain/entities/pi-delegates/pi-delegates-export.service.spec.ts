import ExcelJS from 'exceljs';
import {
  BY_PERSON_COLUMNS,
  BY_PROJECT_COLUMNS,
  PiDelegatesExportService,
  buildByPersonFiltersText,
  buildByProjectFiltersText,
} from './pi-delegates-export.service';
import { ExcelWorkbookBuilder } from '../reports/core/excel-workbook.builder';
import { PiDelegateScopeEnum } from './enum/pi-delegate-scope.enum';
import {
  DelegateProjectsResponseDto,
  ProjectDelegatesResponseDto,
} from './dto/pi-delegate-response.dto';

const project = (
  code: string,
  over: Partial<ProjectDelegatesResponseDto> = {},
): ProjectDelegatesResponseDto => ({
  project_code: code,
  project_name: `Name ${code}`,
  is_pool_funding_contributor: false,
  pi_user_id: 99,
  pi_name: 'Pi Person',
  status: 'ACTIVE',
  funding_type: null,
  start_date: new Date('2025-01-01T00:00:00Z'),
  end_date: null,
  delegates: [],
  ...over,
});

const person = (id: number): DelegateProjectsResponseDto => ({
  delegate_user_id: id,
  name: `Person ${id}`,
  email: `p${id}@cgiar.org`,
  first_name: 'P',
  last_name: String(id),
  carnet: null,
  status_id: 1,
  is_active: true,
  projects: [{ project_code: 'A', project_name: 'Alpha' }],
});

function make(user: Record<string, unknown> = {}) {
  const service = {
    listManagedProjects: jest.fn(),
    listManagedDelegates: jest.fn(),
  };
  const builder = { toBuffer: jest.fn().mockResolvedValue(Buffer.from('x')) };
  const currentUser = {
    user_id: 5,
    user: { first_name: 'Ana', last_name: 'Gomez' },
    ...user,
  };
  const svc = new PiDelegatesExportService(
    service as never,
    builder as never,
    currentUser as never,
  );
  return { svc, service, builder, currentUser };
}

const sheetOf = (builder: { toBuffer: jest.Mock }) =>
  builder.toBuffer.mock.calls[0][0].sheets[0];

describe('PiDelegatesExportService.buildByProjectWorkbook', () => {
  it('keeps requested codes in request order and drops unauthorized ones', async () => {
    const { svc, service, builder } = make();
    service.listManagedProjects.mockResolvedValue([
      project('A'),
      project('B'),
      project('C'),
    ]);

    await svc.buildByProjectWorkbook({
      user_id: 5,
      project_codes: ['C', 'ZZZ', 'A'],
    });

    expect(service.listManagedProjects).toHaveBeenCalledWith(
      5,
      PiDelegateScopeEnum.MANAGED,
    );
    expect(sheetOf(builder).rows.map((r) => r.project_code)).toEqual([
      'C',
      'A',
    ]);
    expect(sheetOf(builder).name).toBe('By project');
  });

  it('produces header-only sheet for an empty key list', async () => {
    const { svc, service, builder } = make();
    service.listManagedProjects.mockResolvedValue([project('A')]);
    await svc.buildByProjectWorkbook({ user_id: 5, project_codes: [] });
    expect(sheetOf(builder).rows).toEqual([]);
    expect(sheetOf(builder).columns).toBe(BY_PROJECT_COLUMNS);
  });

  it('propagates the service authorization error', async () => {
    const { svc, service } = make();
    service.listManagedProjects.mockRejectedValue(new Error('403'));
    await expect(
      svc.buildByProjectWorkbook({ user_id: 9, project_codes: ['A'] }),
    ).rejects.toThrow('403');
  });

  it('maps the by-project columns in the requested order', async () => {
    const { svc, service, builder } = make();
    const d = {
      delegate_user_id: 5,
      name: 'Me',
      email: 'me@x.org',
    } as ProjectDelegatesResponseDto['delegates'][number];
    service.listManagedProjects.mockResolvedValue([
      project('A', { delegates: [d] }),
    ]);
    await svc.buildByProjectWorkbook({ user_id: 5, project_codes: ['A'] });
    expect(BY_PROJECT_COLUMNS.map((c) => c.header)).toEqual([
      'Project code',
      'Project name',
      'Status',
      'Pool funding contributor',
      'Principal Investigator',
      'Number of delegates',
      'Delegates',
    ]);
    const [row] = sheetOf(builder).rows;
    expect(row).not.toHaveProperty('your_role');
    expect(row.delegate_count).toBe(1);
    expect(row.delegate_names).toBe('Me');
    expect(row.pool_funding).toBe('No');
  });

  it('renders the filters line in the banner subtitle', async () => {
    const { svc, service, builder } = make();
    service.listManagedProjects.mockResolvedValue([]);
    await svc.buildByProjectWorkbook({
      user_id: 5,
      project_codes: [],
      filters: {
        role: 'pi',
        ongoing_w3_bilateral_only: true,
        without_delegates_only: true,
        search: 'abc',
      },
    });
    expect(sheetOf(builder).presentation.bannerSubtitle).toContain(
      'Filters applied: Role: Principal Investigator · Ongoing W3 & Bilateral only · Projects without delegates · Search: "abc"',
    );
  });
});

describe('PiDelegatesExportService.buildByPersonWorkbook', () => {
  it('keeps requested ids in order, drops unauthorized, de-duplicates', async () => {
    const { svc, service, builder } = make();
    service.listManagedDelegates.mockResolvedValue([
      person(1),
      person(2),
      person(3),
    ]);
    await svc.buildByPersonWorkbook({
      user_id: 5,
      delegate_user_ids: [3, 99, 1, 3],
    });
    expect(sheetOf(builder).rows.map((r) => r.name)).toEqual([
      'Person 3',
      'Person 1',
    ]);
    expect(sheetOf(builder).name).toBe('By person');
    expect(sheetOf(builder).columns).toBe(BY_PERSON_COLUMNS);
  });

  it('handles empty list and No filters applied', async () => {
    const { svc, service, builder } = make();
    service.listManagedDelegates.mockResolvedValue([person(1)]);
    await svc.buildByPersonWorkbook({ user_id: 5, delegate_user_ids: [] });
    expect(sheetOf(builder).rows).toEqual([]);
    expect(sheetOf(builder).presentation.bannerSubtitle).toContain(
      'Filters applied: No filters applied',
    );
  });
});

describe('filters text + filename', () => {
  it('builds filter texts and sanitizes search', () => {
    expect(buildByProjectFiltersText()).toBe('No filters applied');
    expect(buildByProjectFiltersText({ role: 'delegate' })).toBe(
      'Role: PI Delegate',
    );
    expect(buildByPersonFiltersText({ search: 'a\u0000b' })).toBe(
      'Search: "ab"',
    );
  });

  it('builds filename with initials and UU fallback', () => {
    const now = new Date(2026, 9, 14, 8, 5);
    expect(make().svc.buildFilename('by_project', now)).toBe(
      'STAR_pi_delegates_by_project_20261014_0805_AG.xlsx',
    );
    expect(make({ user: undefined }).svc.buildFilename('by_person', now)).toBe(
      'STAR_pi_delegates_by_person_20261014_0805_UU.xlsx',
    );
  });
});

describe('real workbook rendering', () => {
  it('writes a valid xlsx with the banner and header', async () => {
    const { service, currentUser } = make();
    service.listManagedProjects.mockResolvedValue([project('A')]);
    const svc = new PiDelegatesExportService(
      service as never,
      new ExcelWorkbookBuilder(),
      currentUser as never,
    );
    const buf = await svc.buildByProjectWorkbook({
      user_id: 5,
      project_codes: ['A'],
    });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as never);
    const ws = wb.getWorksheet('By project')!;
    expect(ws.getRow(1).getCell(3).value).toBe('ALLIANCE PI DELEGATES');
    const values = ws.getRow(4).values as unknown[];
    expect(values).toContain('Project code');
    expect(ws.getRow(5).getCell(1).value).toBe('A');
  });
});
