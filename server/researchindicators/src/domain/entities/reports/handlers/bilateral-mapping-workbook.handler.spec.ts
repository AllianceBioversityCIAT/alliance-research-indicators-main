import {
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import ExcelJS from 'exceljs';
import { LoggerUtil } from '../../../shared/utils/logger.util';
import {
  BilateralMappingExportResult,
  BilateralProjectMappingService,
  MappedBilateralExportRow,
} from '../../bilateral-project-mapping/bilateral-project-mapping.service';
import {
  AutomapperService,
  PendingMappingExportRow,
} from '../../bilateral-project-mapping/automapper.service';
import { MappingSourceEnum } from '../../bilateral-project-mapping/enum/mapping-source.enum';
import { ExcelWorkbookBuilder } from '../core/excel-workbook.builder';
import type { ExcelWorkbookSpec } from '../core/excel-workbook.types';
import { BilateralMappingWorkbookHandler } from './bilateral-mapping-workbook.handler';

// @akili-spec docs/specs/bilateral/mapping-filtered-export — T-04 /
// R-MFE-004, R-MFE-005, R-MFE-011. Evidence is the parsed xlsx buffer.

const HEADERS = [
  'Agreement ID (AGRESSO)',
  'Agresso project name',
  'CLARISA Project (Bilateral)',
  'Science Program allocations',
  'Source',
  'Status',
  'Reporting year',
  'Justification',
  'Notes',
  'Status changed by',
  'Status change date',
  'Last Updated',
];

const builder = new ExcelWorkbookBuilder();

const loadSheet = async (
  spec: ExcelWorkbookSpec,
): Promise<ExcelJS.Worksheet> => {
  const buffer = await builder.toBuffer(spec);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  const sheet = workbook.worksheets[0];
  expect(sheet).toBeDefined();
  expect(sheet.getImages()).toEqual([]);
  return sheet;
};

const headerRowIndex = (sheet: ExcelJS.Worksheet): number =>
  sheet.getRow(4).getCell(1).value === HEADERS[0] ? 4 : 5;

const headerValues = (sheet: ExcelJS.Worksheet): string[] => {
  const index = headerRowIndex(sheet);
  return HEADERS.map((_, column) =>
    String(sheet.getRow(index).getCell(column + 1).value ?? ''),
  );
};

const dataCell = (
  sheet: ExcelJS.Worksheet,
  dataIndex: number,
  column: number,
): ExcelJS.Cell =>
  sheet.getRow(headerRowIndex(sheet) + dataIndex).getCell(column);

const shown = (cell: ExcelJS.Cell): string => {
  const value = cell.value;
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }
  return String(value);
};

const assertBlank = (cell: ExcelJS.Cell): void => {
  expect([null, undefined, '']).toContain(cell.value);
  expect(cell.value).not.toBe('null');
  expect(cell.value).not.toBe('undefined');
};

const hasNotice = (sheet: ExcelJS.Worksheet): boolean =>
  String(sheet.getCell('A3').value ?? '').includes(
    'allocations and CLARISA names could not be loaded',
  );

const mapped = (
  overrides: Partial<MappedBilateralExportRow> = {},
): MappedBilateralExportRow =>
  ({
    id: 1,
    agresso_agreement_id: 'AGR-1',
    reporting_year: 2031,
    clarisa_project_id: 501,
    clarisa_project_short_name: 'short-name',
    clarisa_project_full_name: 'Full Bilateral Name',
    source: MappingSourceEnum.MANUAL,
    is_active: false,
    agresso_description: 'Rice agreement',
    status_justification: 'Closed for the season',
    notes: 'Separate note',
    status_changed_by_name: 'Ana Ruiz',
    status_changed_at: new Date('2026-10-20T15:00:00.000Z'),
    updated_at: new Date('2026-11-02T15:00:00.000Z'),
    sciencePrograms: [
      { code: 'SP01', name: 'Plant Health', portfolio: 'P25', allocation: 40 },
      { code: 'SP02', name: 'Gender', portfolio: 'P25', allocation: 60 },
      {
        code: 'SP09',
        name: 'Other',
        portfolio: 'P25',
        allocation: 'n/a' as unknown as number,
      },
    ],
    ...overrides,
  }) as MappedBilateralExportRow;

const pending = (
  overrides: Partial<PendingMappingExportRow> = {},
): PendingMappingExportRow => ({
  clarisaProjectId: 301,
  clarisaProjectFullName: '',
  clarisaProjectShortName: 'Pending Short',
  externalCode: 'C-AAA',
  derivedContractId: 'AAA',
  sciencePrograms: [
    { code: 'SP01', name: 'Plant Health', portfolio: 'P25', allocation: 40 },
    { code: 'SP02', name: 'Gender', portfolio: 'P25', allocation: 60 },
  ],
  ...overrides,
});

describe('BilateralMappingWorkbookHandler', () => {
  let handler: BilateralMappingWorkbookHandler;
  const exportMappings = jest.fn();
  const exportPending = jest.fn();

  beforeEach(async () => {
    exportMappings.mockReset();
    exportPending.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BilateralMappingWorkbookHandler,
        {
          provide: BilateralProjectMappingService,
          useValue: { exportMappings },
        },
        { provide: AutomapperService, useValue: { exportPending } },
      ],
    }).compile();
    handler = module.get(BilateralMappingWorkbookHandler);
  });

  const buildMapped = async (
    result: BilateralMappingExportResult<MappedBilateralExportRow>,
    query: {
      search?: string;
      status?: string;
      source?: MappingSourceEnum;
    } = {},
  ) => {
    exportMappings.mockResolvedValue(result);
    return handler.build(query);
  };

  it('writes the 12 headers on row 4 and the known inactive row in each cell', async () => {
    const built = await buildMapped({
      reportingYear: 2031,
      clarisaAvailable: true,
      clarisaCohortEmpty: false,
      rows: [mapped()],
    });
    const sheet = await loadSheet(built.spec);

    expect(hasNotice(sheet)).toBe(false);
    expect(headerRowIndex(sheet)).toBe(4);
    expect(headerValues(sheet)).toEqual(HEADERS);
    expect(HEADERS).toHaveLength(12);

    const values = HEADERS.map((_, index) =>
      shown(dataCell(sheet, 1, index + 1)),
    );
    expect(values).toEqual([
      'AGR-1',
      'Rice agreement',
      'Full Bilateral Name',
      'SP01 (40%); SP02 (60%); SP09',
      'Manual',
      'Inactive',
      '2031',
      'Closed for the season',
      'Separate note',
      'Ana Ruiz',
      '2026-10-20',
      '2026-11-02',
    ]);
    expect(values[7]).not.toBe(values[8]);
  });

  it('stores the UTC calendar day as an Excel serial that does not depend on the server timezone', async () => {
    const built = await buildMapped({
      reportingYear: 2031,
      clarisaAvailable: true,
      clarisaCohortEmpty: false,
      rows: [mapped()],
    });
    const sheet = await loadSheet(built.spec);
    const statusChange = dataCell(sheet, 1, 11).value;
    const lastUpdated = dataCell(sheet, 1, 12).value;
    expect(statusChange).toBeInstanceOf(Date);
    expect(lastUpdated).toBeInstanceOf(Date);
    // ExcelJS dateToExcel uses getTime(). UTC midnight of the calendar day
    // is the same instant in every timezone; local midnight is not.
    expect((statusChange as Date).getTime()).toBe(Date.UTC(2026, 9, 20));
    expect((lastUpdated as Date).getTime()).toBe(Date.UTC(2026, 10, 2));
  });

  it('leaves absent values blank, including a project missing from a healthy cohort', async () => {
    const built = await buildMapped({
      reportingYear: 2031,
      clarisaAvailable: true,
      clarisaCohortEmpty: false,
      rows: [
        mapped({
          agresso_agreement_id: '   ',
          agresso_description: null,
          clarisa_project_full_name: ' ',
          clarisa_project_short_name: '',
          clarisa_project_id: 77,
          source: 'OTHER' as MappingSourceEnum,
          sciencePrograms: [],
          reporting_year: undefined as unknown as number,
          status_justification: null,
          notes: undefined,
          status_changed_by_name: null,
          status_changed_at: null,
          updated_at: undefined,
          is_active: true,
        }),
      ],
    });
    const sheet = await loadSheet(built.spec);

    expect(hasNotice(sheet)).toBe(false);
    expect(headerRowIndex(sheet)).toBe(4);
    expect(shown(dataCell(sheet, 1, 3))).toBe('Project 77');
    for (const column of [1, 2, 4, 5, 7, 8, 9, 10, 11, 12]) {
      assertBlank(dataCell(sheet, 1, column));
    }
  });

  it('writes a pending row with blank columns 2 and 8-12', async () => {
    exportPending.mockResolvedValue({
      reportingYear: 2031,
      clarisaAvailable: true,
      clarisaCohortEmpty: false,
      rows: [
        pending({
          clarisaProjectFullName: null,
          clarisaProjectShortName: '  ',
          derivedContractId: '',
          sciencePrograms: [],
        }),
      ],
    });
    const built = await handler.build({ status: 'Pending' });
    const sheet = await loadSheet(built.spec);

    expect(exportPending).toHaveBeenCalledTimes(1);
    expect(exportMappings).not.toHaveBeenCalled();
    expect(hasNotice(sheet)).toBe(false);
    expect(shown(dataCell(sheet, 1, 1))).toBe('');
    expect(shown(dataCell(sheet, 1, 3))).toBe('Project 301');
    expect(shown(dataCell(sheet, 1, 5))).toBe('Unmapped');
    expect(shown(dataCell(sheet, 1, 6))).toBe('Pending');
    expect(shown(dataCell(sheet, 1, 7))).toBe('2031');
    for (const column of [2, 8, 9, 10, 11, 12]) {
      assertBlank(dataCell(sheet, 1, column));
    }
  });

  it('uses the five screen source labels', async () => {
    const screenLabels = [
      'Manual',
      'Derived',
      'AI Suggested',
      'AI Auto',
      'Unmapped',
    ];
    const built = await buildMapped({
      reportingYear: 2031,
      clarisaAvailable: true,
      clarisaCohortEmpty: false,
      rows: [
        mapped({ source: MappingSourceEnum.MANUAL, is_active: true }),
        mapped({ source: MappingSourceEnum.DERIVED, is_active: true }),
        mapped({ source: MappingSourceEnum.AI_SUGGESTED, is_active: true }),
        mapped({ source: MappingSourceEnum.AI_AUTO, is_active: true }),
      ],
    });
    const sheet = await loadSheet(built.spec);
    const fromMapped = [1, 2, 3, 4].map((index) =>
      shown(dataCell(sheet, index, 5)),
    );

    exportPending.mockResolvedValue({
      reportingYear: 2031,
      clarisaAvailable: true,
      clarisaCohortEmpty: false,
      rows: [pending()],
    });
    const pendingBuilt = await handler.build({ status: 'pending' });
    const pendingSheet = await loadSheet(pendingBuilt.spec);

    expect([...fromMapped, shown(dataCell(pendingSheet, 1, 5))]).toEqual(
      screenLabels,
    );
  });

  describe('CLARISA through the workbook (R-MFE-011 AC.1, R-MFE-003 AC.3)', () => {
    const withRows = {
      reportingYear: 2031,
      rows: [mapped()],
    };

    it.each([
      ['Failing', false, true],
      ['Never-resolving', false, true],
      ['Malformed', false, true],
      ['Never-resolving with a same-phase stale cache', true, false],
      ['Healthy', true, false],
    ])('All %s', async (_label, available, notice) => {
      const built = await buildMapped({
        ...withRows,
        clarisaAvailable: available,
        clarisaCohortEmpty: false,
      });
      const sheet = await loadSheet(built.spec);
      expect(hasNotice(sheet)).toBe(notice);
      expect(headerRowIndex(sheet)).toBe(notice ? 5 : 4);
      expect(shown(dataCell(sheet, 1, 1))).toBe('AGR-1');
    });

    it.each(['All', 'Mapped'])(
      '%s with a healthy cohort and no matching rows has a header and no notice',
      async (status) => {
        const built = await buildMapped(
          {
            reportingYear: 2031,
            clarisaAvailable: true,
            clarisaCohortEmpty: false,
            rows: [],
          },
          status === 'All' ? {} : { status: 'mapped' },
        );
        const sheet = await loadSheet(built.spec);
        expect(hasNotice(sheet)).toBe(false);
        expect(headerRowIndex(sheet)).toBe(4);
        expect(headerValues(sheet)).toEqual(HEADERS);
        assertBlank(dataCell(sheet, 1, 1));
      },
    );

    it.each(['All', 'Mapped'])(
      '%s empty cohort with mapping rows writes the notice',
      async (status) => {
        const built = await buildMapped(
          {
            reportingYear: 2031,
            clarisaAvailable: true,
            clarisaCohortEmpty: true,
            rows: [mapped()],
          },
          status === 'All' ? {} : { status: 'mapped' },
        );
        const sheet = await loadSheet(built.spec);
        expect(hasNotice(sheet)).toBe(true);
        expect(headerRowIndex(sheet)).toBe(5);
        expect(shown(dataCell(sheet, 1, 1))).toBe('AGR-1');
      },
    );

    it.each(['Failing', 'Never-resolving', 'Malformed'])(
      'Pending %s is 503 and does not build a file',
      async () => {
        exportPending.mockRejectedValue(
          new ServiceUnavailableException(
            'CLARISA /api/projects temporarily unreachable',
          ),
        );
        await expect(
          handler.build({ status: 'pending' }),
        ).rejects.toBeInstanceOf(ServiceUnavailableException);
      },
    );

    it('Pending empty cohort is a file with the notice', async () => {
      exportPending.mockResolvedValue({
        reportingYear: 2031,
        clarisaAvailable: true,
        clarisaCohortEmpty: true,
        rows: [],
      });
      const built = await handler.build({ status: 'pending' });
      const sheet = await loadSheet(built.spec);
      expect(hasNotice(sheet)).toBe(true);
      expect(headerValues(sheet)).toEqual(HEADERS);
      assertBlank(dataCell(sheet, 1, 1));
    });

    it.each(['Never-resolving with a same-phase stale cache', 'Healthy'])(
      'Pending %s is a file without the notice',
      async () => {
        exportPending.mockResolvedValue({
          reportingYear: 2031,
          clarisaAvailable: true,
          clarisaCohortEmpty: false,
          rows: [pending()],
        });
        const built = await handler.build({ status: 'pending' });
        const sheet = await loadSheet(built.spec);
        expect(hasNotice(sheet)).toBe(false);
        expect(shown(dataCell(sheet, 1, 6))).toBe('Pending');
      },
    );

    it('passes a pending automapper guard through as 422 and builds no file', async () => {
      exportPending.mockRejectedValue(
        new UnprocessableEntityException('Automapper aborted'),
      );
      await expect(handler.build({ status: 'pending' })).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });

    it('does not report a pending database error as a CLARISA 503', async () => {
      exportPending.mockRejectedValue(new Error('slow query'));
      const error = await handler
        .build({ status: 'pending' })
        .catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(ServiceUnavailableException);
      expect((error as Error).message).toBe('slow query');
    });
  });

  it('names an empty export from the operation year, in UTC, and the file still opens', async () => {
    const RealDate = Date;
    const fixed = new RealDate('2026-10-20T02:30:00.000Z');
    const dateSpy = jest
      .spyOn(global, 'Date')
      .mockImplementation((...args: unknown[]) => {
        if (args.length === 0) return new RealDate(fixed.getTime());
        return new RealDate(...(args as ConstructorParameters<typeof Date>));
      });

    let built: { spec: ExcelWorkbookSpec; fileName: string };
    try {
      built = await buildMapped({
        reportingYear: 2031,
        clarisaAvailable: true,
        clarisaCohortEmpty: false,
        rows: [],
      });
    } finally {
      dateSpy.mockRestore();
    }

    expect(built.fileName).toBe('Bilateral_Mapping_2031_20261020.xlsx');
    const sheet = await loadSheet(built.spec);
    expect(hasNotice(sheet)).toBe(false);
    expect(headerRowIndex(sheet)).toBe(4);
    expect(headerValues(sheet)).toEqual(HEADERS);
  });

  it('lists the applied filters in the subtitle and says dates are UTC', async () => {
    const built = await buildMapped(
      {
        reportingYear: 2031,
        clarisaAvailable: true,
        clarisaCohortEmpty: false,
        rows: [mapped()],
      },
      {
        search: 'Rice',
        status: 'Mapped',
        source: MappingSourceEnum.DERIVED,
      },
    );
    const sheet = await loadSheet(built.spec);
    expect(sheet.getCell('A2').value).toBe(
      'Filters: Search: Rice | Status: mapped | Source: DERIVED. Dates are in UTC.',
    );

    exportPending.mockResolvedValue({
      reportingYear: 2031,
      clarisaAvailable: true,
      clarisaCohortEmpty: false,
      rows: [pending()],
    });
    const pendingBuilt = await handler.build({
      status: 'pending',
      search: 'alpha',
      source: MappingSourceEnum.MANUAL,
    });
    const pendingSheet = await loadSheet(pendingBuilt.spec);
    expect(pendingSheet.getCell('A2').value).toBe(
      'Filters: Search: alpha | Status: pending. Dates are in UTC.',
    );
  });

  it('logs status, row count and the notice flag, and no row data', async () => {
    const log = jest
      .spyOn(LoggerUtil.prototype, '_log')
      .mockImplementation(() => undefined);
    let lines: string[] = [];
    try {
      await buildMapped(
        {
          reportingYear: 2031,
          clarisaAvailable: false,
          clarisaCohortEmpty: false,
          rows: [mapped()],
        },
        { search: 'Rice', status: 'mapped' },
      );
      lines = log.mock.calls.map((call) => String(call[0]));
    } finally {
      log.mockRestore();
    }
    expect(
      lines.some(
        (line) =>
          line.includes('status=mapped') &&
          line.includes('rows=1') &&
          line.includes('notice=true'),
      ),
    ).toBe(true);
    expect(lines.join('\n')).not.toContain('Rice');
    expect(lines.join('\n')).not.toContain('AGR-1');
  });

  it('sends an unknown status to the mapping export', async () => {
    exportMappings.mockResolvedValue({
      reportingYear: 2031,
      clarisaAvailable: true,
      clarisaCohortEmpty: false,
      rows: [],
    });
    await handler.build({ status: 'archived' });
    expect(exportMappings).toHaveBeenCalledWith({ status: 'archived' });
    expect(exportPending).not.toHaveBeenCalled();
  });
});
