import * as fs from 'fs';
import { Test, TestingModule } from '@nestjs/testing';
import ExcelJS from 'exceljs';
import { ExcelWorkbookBuilder } from '../../core/excel-workbook.builder';
import { WorkbookSheetOrderResolver } from '../../core/workbook-sheet-order.resolver';
import { StarResultsExportRepository } from '../../repositories/star-results-export.repository';
import { STAR_RESULTS_METADATA_DICTIONARY_ROWS } from './star-results-metadata.dictionary';
import {
  STAR_RESULTS_METADATA_SHEET_KEYS,
  STAR_RESULTS_METADATA_SHEET_ORDER_ENV,
  STAR_RESULTS_METADATA_WORKBOOK_KEY,
} from '../../constants/star-results-metadata.constants';
import { StarResultsMetadataWorkbookHandler } from './star-results-metadata-workbook.handler';
import { STAR_INNOVATION_DEV_RAW_COLUMNS } from './star-results-metadata.innovation-dev.columns';
import { ResultSortEnum } from '../../../results/enum/result-sort.enum';

jest.mock('fs', () => ({
  ...jest.requireActual<typeof import('fs')>('fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

const existsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
const readFileSync = fs.readFileSync as jest.MockedFunction<
  typeof fs.readFileSync
>;

/** Requirements §1 intended layout. Literals, not derived. */
const INTENDED_RAW_BANDS = [
  { fromCol: 1, toCol: 14, label: 'GENERAL INFORMATION', fillArgb: 'FF203C61' },
  { fromCol: 15, toCol: 25, label: 'ALLIANCE ALIGNMENT', fillArgb: 'FF2A4783' },
  { fromCol: 26, toCol: 26, label: 'PARTNERS', fillArgb: 'FF325B94' },
  { fromCol: 27, toCol: 30, label: 'GEOGRAPHIC SCOPE', fillArgb: 'FF5A91D3' },
  { fromCol: 31, toCol: 32, label: 'EVIDENCES', fillArgb: 'FF64B1DD' },
  { fromCol: 33, toCol: 33, label: 'LINK TO RESULT', fillArgb: 'FF7E57C2' },
  { fromCol: 34, toCol: 38, label: 'IP RIGHTS', fillArgb: 'FF35749A' },
  {
    fromCol: 39,
    toCol: 59,
    label: 'CAPSHARING DETAILS',
    fillArgb: 'FF4D7C31',
  },
  { fromCol: 60, toCol: 63, label: 'POLICY DETAILS', fillArgb: 'FFDA7842' },
  { fromCol: 64, toCol: 78, label: 'OICR DETAILS', fillArgb: 'FFD9A041' },
  { fromCol: 79, toCol: 84, label: 'INNOVATION USE', fillArgb: 'FF6A1B9A' },
  {
    fromCol: 85,
    toCol: 115,
    label: 'INNOVATION DEVELOPMENT',
    fillArgb: 'FF00897B',
  },
] as const;

/** Design §3.2a labels for columns 85–115. Literals, not taken from the column module. */
const INNOVATION_DEV_HEADERS = [
  'Short title',
  'Innovation nature',
  'Innovation type',
  'New or improved variety or breed',
  'Number of new or improved lines/varieties',
  'Innovation readiness level',
  'Readiness explanation',
  'Anticipated users',
  'Actors',
  'Organizations',
  'Intended beneficiaries/users elaborated',
  'Expected outcomes',
  'Potential for researchers/policymakers adaptation',
  'Method/tool qualifies for dissemination',
  'Context for tool usefulness',
  'Results detailed with examples',
  'Tool function',
  'Innovation used beyond original context',
  'Adopted and adapted in other contexts',
  'Tools often used together',
  'Other tools',
  "Other tools' usage with this one description",
  'Formulation: Is it cheaper compared to alternatives?',
  'Formulation: Is it simpler to use?',
  'Formulation: Does it perform better?',
  'Demand and Investment: Is the innovation desirable to intended users?',
  'Demand and Investment: Is the innovation commercially viable/is there investment potential?',
  'Sustained use: Is the innovation supported by a suitable enabling environment?',
  'Sustained use: Is there already evidence of uptake?',
  'Sustained use: Is there potential for actor in new contexts and for new purposes?',
  'Expansion and adaptation details',
] as const;

function rowContaining(ws: ExcelJS.Worksheet, text: string): number {
  let found = 0;
  ws.eachRow((row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (found === 0 && cell.value === text) {
        found = Number(row.number);
      }
    });
  });
  return found;
}

function sheetContainsComingSoon(ws: ExcelJS.Worksheet): boolean {
  let found = false;
  ws.eachRow((row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (
        typeof cell.value === 'string' &&
        cell.value.toLowerCase().includes('coming soon')
      ) {
        found = true;
      }
    });
  });
  return found;
}

function excelColumnLetter(col: number): string {
  let n = col;
  let s = '';
  while (n > 0) {
    n -= 1;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

async function withSheetOrder(
  csv: string | undefined,
  run: () => Promise<void>,
): Promise<void> {
  const key = STAR_RESULTS_METADATA_SHEET_ORDER_ENV;
  const previous = process.env[key];
  if (csv === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = csv;
  }
  try {
    await run();
  } finally {
    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  }
}

describe('StarResultsMetadataWorkbookHandler', () => {
  let handler: StarResultsMetadataWorkbookHandler;
  const findStarResultsMetadataRows = jest.fn();
  const fetchMock = jest.fn();

  const baseFilters = {
    filters: {
      search: '',
      statusCodes: [],
      contractCodes: [],
      years: [],
      platformCode: [],
      indicators: [],
      onlyOwnResults: false,
      currentUserId: 1,
    },
    sorting: { sortOrder: 'DESC' as const, sortField: ResultSortEnum.CODE },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
    delete process.env[STAR_RESULTS_METADATA_SHEET_ORDER_ENV];
    findStarResultsMetadataRows.mockResolvedValue([{ result_code: 'RC' }]);
    existsSync.mockReturnValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StarResultsMetadataWorkbookHandler,
        WorkbookSheetOrderResolver,
        {
          provide: StarResultsExportRepository,
          useValue: { findStarResultsMetadataRows },
        },
      ],
    }).compile();
    handler = module.get(StarResultsMetadataWorkbookHandler);
  });

  it('exposes workbook key and sheet order env name', () => {
    expect(handler.workbookKey).toBe(STAR_RESULTS_METADATA_WORKBOOK_KEY);
    expect(handler.sheetOrderEnvVarName).toBeTruthy();
  });

  it('builds workbook spec from the server-side layout and a fetched logo', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      headers: { get: () => 'image/png' },
    });
    const spec = await handler.buildWorkbookSpec(baseFilters);
    expect(spec.sheets).toHaveLength(2);
    expect(spec.sheets[0].sheetKey).toBe(
      STAR_RESULTS_METADATA_SHEET_KEYS.RAW_DATA,
    );
    expect(spec.sheets[1].sheetKey).toBe(
      STAR_RESULTS_METADATA_SHEET_KEYS.DATA_DICTIONARY,
    );
    const raw = spec.sheets.find(
      (s) => s.sheetKey === STAR_RESULTS_METADATA_SHEET_KEYS.RAW_DATA,
    );
    expect(raw?.rows).toEqual([{ result_code: 'RC' }]);
    expect(raw?.presentation?.logoImage).toEqual({
      buffer: expect.any(Buffer),
      extension: 'png',
    });
    expect(findStarResultsMetadataRows).toHaveBeenCalledWith(baseFilters);
    expect(raw?.presentation?.bannerSubtitle).toBe(
      'This file contains the results generated from the selected filters in STAR.',
    );
    expect(raw?.presentation?.bannerNotice).toBeUndefined();
    expect(raw?.presentation?.bannerTitleMergeToCol).toBe(115);
    expect(raw?.columns).toHaveLength(115);
  });

  it('builds Raw data then Data dictionary and does not read layout tables', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1]).buffer,
      headers: { get: () => 'image/png' },
    });
    await withSheetOrder(undefined, async () => {
      const spec = await handler.buildWorkbookSpec(baseFilters);
      expect(spec.sheets.map((s) => s.name)).toEqual([
        'Raw data',
        'Data dictionary',
      ]);
    });
  });

  it('fills Raw data column 34 header with FF35749A', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1]).buffer,
      headers: { get: () => 'image/png' },
    });
    const spec = await handler.buildWorkbookSpec(baseFilters);
    const raw = spec.sheets.find(
      (s) => s.sheetKey === STAR_RESULTS_METADATA_SHEET_KEYS.RAW_DATA,
    );
    expect(raw?.columns[33]?.headerFillArgb).toBe('FF35749A');
  });

  it('builds the Data dictionary sheet from the in-code rows', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1]).buffer,
      headers: { get: () => 'image/png' },
    });
    const spec = await handler.buildWorkbookSpec(baseFilters);
    const dictionary = spec.sheets.find(
      (s) => s.sheetKey === STAR_RESULTS_METADATA_SHEET_KEYS.DATA_DICTIONARY,
    );
    const rows = dictionary?.rows ?? [];
    expect(rows).toHaveLength(STAR_RESULTS_METADATA_DICTIONARY_ROWS.length);
    expect(rows[0]).toMatchObject({
      section: 'General Information',
      field_label: 'Result Code',
      _rowFillArgb: 'FF203C61',
    });
    // A row without its own fill inherits the band above it.
    expect(rows[1]).toMatchObject({
      section: '',
      field_label: 'Source Platform',
      _rowFillArgb: 'FF203C61',
    });
    expect(rows.map((r) => r.field_label)).not.toContain(
      'Sex and age disaggregation not applicable',
    );
  });

  it('reads back the twelve section bands and the C1:DK1 banner', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1]).buffer,
      headers: { get: () => 'image/png' },
    });
    const spec = await handler.buildWorkbookSpec(baseFilters);
    const buf = await new ExcelWorkbookBuilder().toBuffer(spec);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as never);
    const ws = wb.getWorksheet('Raw data');
    expect(ws).toBeDefined();
    const merges = ws!.model.merges;
    const banner = merges.find((m) => m.startsWith('C1:'));
    expect(banner).toBe('C1:DK1');
    expect(sheetContainsComingSoon(ws!)).toBe(false);
    for (const band of INTENDED_RAW_BANDS) {
      let located: ExcelJS.Cell | undefined;
      ws!.eachRow((row) => {
        row.eachCell((cell) => {
          if (cell.value === band.label) {
            located = cell;
          }
        });
      });
      expect({ label: band.label, found: located !== undefined }).toEqual({
        label: band.label,
        found: true,
      });
      const rowNumber = Number(located!.row);
      const range = `${excelColumnLetter(band.fromCol)}${rowNumber}:${excelColumnLetter(band.toCol)}${rowNumber}`;
      if (band.fromCol === band.toCol) {
        // ExcelJS drops a merge of a cell onto itself, so a one-column band is that cell.
        expect(located!.col).toBe(band.fromCol);
        expect(
          merges.some((m) =>
            m.startsWith(`${excelColumnLetter(band.fromCol)}${rowNumber}:`),
          ),
        ).toBe(false);
      } else {
        expect(merges).toContain(range);
      }
      expect(
        (located!.fill as ExcelJS.FillPattern).fgColor?.argb?.toUpperCase(),
      ).toBe(band.fillArgb);
    }
    const headerCell = ws!
      .getRow(rowContaining(ws!, 'Who owns IP rights?'))
      .getCell(34);
    expect(
      (headerCell.fill as ExcelJS.FillPattern).fgColor?.argb?.toUpperCase(),
    ).toBe('FF35749A');
  });

  it('ignores an unknown key in the sheet-order override', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1]).buffer,
      headers: { get: () => 'image/png' },
    });
    await withSheetOrder('not_a_sheet,raw_data,data_dictionary', async () => {
      const spec = await handler.buildWorkbookSpec(baseFilters);
      expect(spec.sheets.map((s) => s.name)).toEqual([
        'Raw data',
        'Data dictionary',
      ]);
    });
  });

  it('reorders sheets when the override lists the dictionary first', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1]).buffer,
      headers: { get: () => 'image/png' },
    });
    await withSheetOrder('data_dictionary,raw_data', async () => {
      const spec = await handler.buildWorkbookSpec(baseFilters);
      expect(spec.sheets.map((s) => s.name)).toEqual([
        'Data dictionary',
        'Raw data',
      ]);
    });
  });

  it('includes cellDataType on raw sheet columns for year and date fields', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      headers: { get: () => 'image/png' },
    });
    const spec = await handler.buildWorkbookSpec(baseFilters);
    const raw = spec.sheets.find(
      (s) => s.sheetKey === STAR_RESULTS_METADATA_SHEET_KEYS.RAW_DATA,
    );
    const byKey = new Map(raw!.columns.map((c) => [c.key, c] as const));
    expect(byKey.get('reporting_year')?.cellDataType).toBe('integer');
    expect(byKey.get('creation_date')?.cellDataType).toBe('date');
    expect(byKey.get('primary_project_start_date')?.cellDataType).toBe('date');
    expect(byKey.get('primary_project_end_date')?.cellDataType).toBe('date');
    expect(byKey.get('start_date')?.cellDataType).toBe('date');
    expect(byKey.get('end_date')?.cellDataType).toBe('date');
    expect(byKey.get('result_code')?.cellDataType).toBeUndefined();
    expect(raw!.columns).toHaveLength(115);
    expect(
      raw!.columns.find((c) => c.key === 'training_engagement_report')?.header,
    ).toBe('Training type');
    expect(raw!.columns.find((c) => c.key === 'policy_type')?.header).toBe(
      'Policy type',
    );
    expect(raw!.columns.find((c) => c.key === 'impact_area')?.header).toBe(
      'Impact Areas',
    );
    expect(raw!.columns.find((c) => c.key === 'for_external_use')?.header).toBe(
      'Further communication opportunities',
    );
    expect(
      raw!.columns.find((c) => c.key === 'for_external_use_description')
        ?.header,
    ).toBe('Further communication opportunities description');
    expect(raw!.columns.find((c) => c.key === 'sdg_targets')?.header).toBe(
      'Contribution to SDG targets',
    );
  });

  it('renders typed reporting_year and creation_date cells in exported xlsx', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1]).buffer,
      headers: { get: () => 'image/png' },
    });
    findStarResultsMetadataRows.mockResolvedValue([
      {
        result_code: 'RC',
        reporting_year: '2024',
        creation_date: '2024-03-15',
      },
    ]);
    const spec = await handler.buildWorkbookSpec(baseFilters);
    const raw = spec.sheets.find(
      (s) => s.sheetKey === STAR_RESULTS_METADATA_SHEET_KEYS.RAW_DATA,
    )!;
    const buf = await new ExcelWorkbookBuilder().toBuffer(spec);
    const wb = new ExcelJS.Workbook();
    // ExcelJS `load` typings are narrower than Node `Buffer` (ArrayBufferLike).
    await wb.xlsx.load(buf as never);
    const ws = wb.getWorksheet('Raw data');
    expect(ws).toBeDefined();
    const yearCol =
      raw.columns.findIndex((c) => c.key === 'reporting_year') + 1;
    const dateCol = raw.columns.findIndex((c) => c.key === 'creation_date') + 1;
    const headerRowNumber = rowContaining(ws!, 'Reporting year');
    const dataRow = ws!.getRow(headerRowNumber + 1);
    expect(dataRow.getCell(yearCol).value).toBe(2024);
    expect(dataRow.getCell(yearCol).numFmt).toBe('0');
    const dateCell = dataRow.getCell(dateCol);
    expect(dateCell.value).toEqual(expect.any(Date));
    expect(dateCell.numFmt).toBe('yyyy-mm-dd');
    const d = dateCell.value as Date;
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(2);
    expect(d.getUTCDate()).toBe(15);
  });

  it('reads Innovation Use values back under headers 79–84', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1]).buffer,
      headers: { get: () => 'image/png' },
    });
    const actors =
      '• Farmers — Total: 12 (sex and age disaggregation not applicable)\n• Researchers — Total: 3 (sex and age disaggregation not applicable)';
    const innovationUseRow: Record<string, string> = {
      result_code: 'IU-1',
      innovation_use_level: 'Level 7: Uptake by farmers',
      innovation_use_level_explanation:
        'Farmers adopted the practice after the second season.',
      innovation_use_actors: actors,
      innovation_use_organizations: '• CIAT - Alliance of Bioversity and CIAT',
      innovation_use_quantifications: '• 12 hectare — Area under the practice',
      innovation_use_linked_dev: 'STAR-100 - Drought tolerant bean',
      innovation_use_linked_dev_url:
        'https://app.example/result/STAR-100/general-information',
      innovation_use_linked_dev_readiness: 'Level 4: Proven under testing',
      innovation_use_linked_dev_description:
        'A bean variety selected for drought.',
      innovation_use_linked_dev_geo_scope: 'National',
    };
    const headers = [
      'Innovation use level',
      'Use level justification',
      'Linked innovation development',
      'Actors',
      'Organizations',
      'Quantifications',
    ];
    const keys = [
      'innovation_use_level',
      'innovation_use_level_explanation',
      'innovation_use_linked_dev',
      'innovation_use_actors',
      'innovation_use_organizations',
      'innovation_use_quantifications',
    ];
    findStarResultsMetadataRows.mockResolvedValue([
      innovationUseRow,
      {
        result_code: 'IU-unlinked',
        innovation_use_linked_dev: 'Not provided',
        innovation_use_linked_dev_url: null,
      },
    ]);
    const spec = await handler.buildWorkbookSpec(baseFilters);
    const buf = await new ExcelWorkbookBuilder().toBuffer(spec);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as never);
    const ws = wb.getWorksheet('Raw data');
    expect(ws).toBeDefined();
    const letter = (col: number): string => {
      let n = col;
      let s = '';
      while (n > 0) {
        n -= 1;
        s = String.fromCharCode(65 + (n % 26)) + s;
        n = Math.floor(n / 26);
      }
      return s;
    };
    const merges = ws!.model.merges;
    const headerRowNumber = rowContaining(ws!, 'Innovation use level');
    const groupRowNumber = headerRowNumber - 1;
    expect(merges).toContain('C1:DK1');
    expect(merges).toContain(
      `${letter(79)}${groupRowNumber}:${letter(84)}${groupRowNumber}`,
    );
    expect(merges).toContain(
      `${letter(64)}${groupRowNumber}:${letter(78)}${groupRowNumber}`,
    );
    expect(ws!.getRow(groupRowNumber).getCell(79).value).toBe('INNOVATION USE');
    expect(ws!.getRow(headerRowNumber).getCell(78).value).toBe('Impact Areas');
    const headerRow = ws!.getRow(headerRowNumber);
    const dataRow = ws!.getRow(headerRowNumber + 1);
    headers.forEach((header, index) => {
      const col = 79 + index;
      expect(headerRow.getCell(col).value).toBe(header);
      if (keys[index] === 'innovation_use_linked_dev') {
        expect(dataRow.getCell(col).value).toEqual({
          text: 'STAR-100 - Drought tolerant bean',
          hyperlink: 'https://app.example/result/STAR-100/general-information',
        });
        return;
      }
      expect(dataRow.getCell(col).value).toBe(innovationUseRow[keys[index]]);
    });
    const unlinked = ws!.getRow(headerRowNumber + 2).getCell(81);
    expect(unlinked.value).toBe('Not provided');
    expect(typeof unlinked.value).toBe('string');
    const actorsCol = 79 + headers.indexOf('Actors');
    expect(headerRow.getCell(actorsCol).value).toBe('Actors');
    expect(dataRow.getCell(actorsCol).value).toBe(actors);
  });

  it('includes linkAppearance on public_link and platform_link columns', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      headers: { get: () => 'image/png' },
    });
    const spec = await handler.buildWorkbookSpec(baseFilters);
    const raw = spec.sheets.find(
      (s) => s.sheetKey === STAR_RESULTS_METADATA_SHEET_KEYS.RAW_DATA,
    );
    const publicLink = raw?.columns.find((c) => c.key === 'public_link');
    const platformLink = raw?.columns.find((c) => c.key === 'platform_link');
    expect(publicLink?.hyperlink?.linkAppearance?.colorArgb).toBe('FF0563C1');
    expect(publicLink?.hyperlink?.linkAppearance?.underline).toBe(true);
    expect(platformLink?.hyperlink?.linkAppearance?.colorArgb).toBe('FF0563C1');
    expect(platformLink?.hyperlink?.linkAppearance?.underline).toBe(true);
  });

  it('exports xlsx with blue underlined public_link cell', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1]).buffer,
      headers: { get: () => 'image/png' },
    });
    findStarResultsMetadataRows.mockResolvedValue([
      {
        result_code: 'R1',
        public_link: 'https://example.org/star-result',
      },
    ]);
    const spec = await handler.buildWorkbookSpec(baseFilters);
    const raw = spec.sheets.find(
      (s) => s.sheetKey === STAR_RESULTS_METADATA_SHEET_KEYS.RAW_DATA,
    )!;
    const buf = await new ExcelWorkbookBuilder().toBuffer(spec);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as never);
    const col = raw.columns.findIndex((c) => c.key === 'public_link') + 1;
    const rawSheet = wb.getWorksheet('Raw data')!;
    const cell = rawSheet
      .getRow(rowContaining(rawSheet, 'Public link') + 1)
      .getCell(col);
    expect(cell.value).toEqual(
      expect.objectContaining({
        hyperlink: 'https://example.org/star-result',
      }),
    );
    expect(cell.font?.underline).toBeTruthy();
    expect(cell.font?.color?.argb?.toUpperCase()).toBe('FF0563C1');
  });

  it('uses gif extension from content-type', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1]).buffer,
      headers: { get: () => 'image/gif' },
    });
    const spec = await handler.buildWorkbookSpec(baseFilters);
    const raw = spec.sheets.find(
      (s) => s.sheetKey === STAR_RESULTS_METADATA_SHEET_KEYS.RAW_DATA,
    );
    expect(raw?.presentation?.logoImage?.extension).toBe('gif');
  });

  it('uses jpeg extension from content-type', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1]).buffer,
      headers: { get: () => 'image/jpeg' },
    });
    const spec = await handler.buildWorkbookSpec(baseFilters);
    const raw = spec.sheets.find(
      (s) => s.sheetKey === STAR_RESULTS_METADATA_SHEET_KEYS.RAW_DATA,
    );
    expect(raw?.presentation?.logoImage?.extension).toBe('jpeg');
  });

  it('maps image/jpg content-type to jpeg extension', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1]).buffer,
      headers: { get: () => 'image/jpg' },
    });
    const spec = await handler.buildWorkbookSpec(baseFilters);
    const raw = spec.sheets.find(
      (s) => s.sheetKey === STAR_RESULTS_METADATA_SHEET_KEYS.RAW_DATA,
    );
    expect(raw?.presentation?.logoImage?.extension).toBe('jpeg');
  });

  it('falls back to bundled logo when response is not ok', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(Buffer.from('png'));
    const spec = await handler.buildWorkbookSpec(baseFilters);
    const raw = spec.sheets.find(
      (s) => s.sheetKey === STAR_RESULTS_METADATA_SHEET_KEYS.RAW_DATA,
    );
    expect(readFileSync).toHaveBeenCalled();
    expect(raw?.presentation?.logoImage?.buffer).toBeInstanceOf(Buffer);
  });

  it('falls back to bundled logo when response body is empty', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
      headers: { get: () => null as unknown as string },
    });
    existsSync.mockReturnValue(false);
    const spec = await handler.buildWorkbookSpec(baseFilters);
    const raw = spec.sheets.find(
      (s) => s.sheetKey === STAR_RESULTS_METADATA_SHEET_KEYS.RAW_DATA,
    );
    expect(raw?.presentation?.logoImage).toBeUndefined();
  });

  it('defaults content-type to png when header is missing', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2]).buffer,
      headers: { get: () => null as unknown as string },
    });
    const spec = await handler.buildWorkbookSpec(baseFilters);
    const raw = spec.sheets.find(
      (s) => s.sheetKey === STAR_RESULTS_METADATA_SHEET_KEYS.RAW_DATA,
    );
    expect(raw?.presentation?.logoImage?.extension).toBe('png');
  });

  it('falls back to bundled logo when fetch throws', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    existsSync.mockReturnValue(false);
    await handler.buildWorkbookSpec(baseFilters);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('uses bundled logo as logoImage when fetch fails and asset exists', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(Buffer.from('x'));
    const spec = await handler.buildWorkbookSpec(baseFilters);
    const raw = spec.sheets.find(
      (s) => s.sheetKey === STAR_RESULTS_METADATA_SHEET_KEYS.RAW_DATA,
    );
    expect(raw?.presentation?.logoImage).toMatchObject({
      buffer: expect.any(Buffer),
      extension: 'png',
    });
  });

  it('maps bundled asset .jpg path to jpeg logoImage', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- `jest.spyOn` needs CJS `path` (ESM `extname` is non-configurable)
    const pathMod = require('path') as typeof import('path');
    fetchMock.mockResolvedValue({ ok: false });
    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(Buffer.from('x'));
    jest.spyOn(pathMod, 'extname').mockReturnValue('.jpg');
    const spec = await handler.buildWorkbookSpec(baseFilters);
    const raw = spec.sheets.find(
      (s) => s.sheetKey === STAR_RESULTS_METADATA_SHEET_KEYS.RAW_DATA,
    );
    expect(raw?.presentation?.logoImage?.extension).toBe('jpeg');
    jest.restoreAllMocks();
  });

  it('maps bundled asset .gif path to gif logoImage', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- same as .jpg bundled-asset test
    const pathMod = require('path') as typeof import('path');
    fetchMock.mockResolvedValue({ ok: false });
    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(Buffer.from('x'));
    jest.spyOn(pathMod, 'extname').mockReturnValue('.gif');
    const spec = await handler.buildWorkbookSpec(baseFilters);
    const raw = spec.sheets.find(
      (s) => s.sheetKey === STAR_RESULTS_METADATA_SHEET_KEYS.RAW_DATA,
    );
    expect(raw?.presentation?.logoImage?.extension).toBe('gif');
    jest.restoreAllMocks();
  });

  it('ignores sheet order env when sheetOrderEnvVarName is empty', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1]).buffer,
      headers: { get: () => 'image/png' },
    });
    Object.defineProperty(handler, 'sheetOrderEnvVarName', {
      value: '',
      configurable: true,
    });
    const spec = await handler.buildWorkbookSpec(baseFilters);
    expect(spec.sheets.length).toBeGreaterThan(0);
  });

  it('reads Innovation Development headers by content at columns 85-115', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1]).buffer,
      headers: { get: () => 'image/png' },
    });
    const devRow: Record<string, string> = {
      result_code: 'DEV-2',
      indicator: 'Innovation Development',
    };
    STAR_INNOVATION_DEV_RAW_COLUMNS.forEach((column, index) => {
      devRow[column.key] = `cell-${index}`;
    });
    const otherRow: Record<string, string> = {
      result_code: 'KP-3',
      indicator: 'Knowledge Product',
    };
    for (const column of STAR_INNOVATION_DEV_RAW_COLUMNS) {
      otherRow[column.key] = 'Not applicable';
    }
    findStarResultsMetadataRows.mockResolvedValue([devRow, otherRow]);
    const spec = await handler.buildWorkbookSpec(baseFilters);
    const buf = await new ExcelWorkbookBuilder().toBuffer(spec);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as never);
    const ws = wb.getWorksheet('Raw data');
    expect(ws).toBeDefined();
    expect(sheetContainsComingSoon(ws!)).toBe(false);
    const headerRowNumber = rowContaining(ws!, 'Short title');
    expect(headerRowNumber).toBeGreaterThan(0);
    const headerRow = ws!.getRow(headerRowNumber);
    expect(headerRow.getCell(84).value).toBe('Quantifications');
    INNOVATION_DEV_HEADERS.forEach((header, index) => {
      expect(headerRow.getCell(85 + index).value).toBe(header);
    });
    expect(
      (
        headerRow.getCell(85).fill as ExcelJS.FillPattern
      ).fgColor?.argb?.toUpperCase(),
    ).toBe('FF00897B');
    const devData = ws!.getRow(headerRowNumber + 1);
    expect(devData.getCell(85).value).toBe('cell-0');
    expect(devData.getCell(115).value).toBe('cell-30');
    const otherData = ws!.getRow(headerRowNumber + 2);
    expect(otherData.getCell(85).value).toBe('Not applicable');
    expect(otherData.getCell(115).value).toBe('Not applicable');
    const merges = ws!.model.merges;
    const groupRowNumber = headerRowNumber - 1;
    expect(merges).toContain(
      `${excelColumnLetter(85)}${groupRowNumber}:${excelColumnLetter(115)}${groupRowNumber}`,
    );
    expect(ws!.getRow(groupRowNumber).getCell(85).value).toBe(
      'INNOVATION DEVELOPMENT',
    );
  });
});
