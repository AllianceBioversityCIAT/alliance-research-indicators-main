import * as fs from 'fs';
import { Test, TestingModule } from '@nestjs/testing';
import ExcelJS from 'exceljs';
import { ExcelWorkbookBuilder } from '../../core/excel-workbook.builder';
import { WorkbookSheetOrderResolver } from '../../core/workbook-sheet-order.resolver';
import { ReportLayoutRepository } from '../../repositories/report-layout.repository';
import { StarResultsExportRepository } from '../../repositories/star-results-export.repository';
import {
  STAR_RESULTS_METADATA_SHEET_KEYS,
  STAR_RESULTS_METADATA_WORKBOOK_KEY,
} from '../../constants/star-results-metadata.constants';
import { StarResultsMetadataWorkbookHandler } from './star-results-metadata-workbook.handler';
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

describe('StarResultsMetadataWorkbookHandler', () => {
  let handler: StarResultsMetadataWorkbookHandler;
  const findActiveSheets = jest.fn();
  const findDataDictionaryRows = jest.fn();
  const findColumnGroups = jest.fn();
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
    findActiveSheets.mockResolvedValue([
      {
        sheet_key: STAR_RESULTS_METADATA_SHEET_KEYS.DATA_DICTIONARY,
        sheet_name: 'Dict',
        sort_order: 1,
      },
      {
        sheet_key: STAR_RESULTS_METADATA_SHEET_KEYS.RAW_DATA,
        sheet_name: 'Raw',
        sort_order: 2,
      },
    ]);
    findDataDictionaryRows.mockResolvedValue([
      {
        section: 'S',
        field_label: 'F',
        explanation: 'E',
        section_fill_argb: 'FF111111',
      },
      {
        section: null,
        field_label: 'F2',
        explanation: null,
        section_fill_argb: null,
      },
    ]);
    findColumnGroups.mockResolvedValue([
      {
        from_col: 1,
        to_col: 2,
        label: 'L',
        fill_argb: 'FF222222',
      },
    ]);
    findStarResultsMetadataRows.mockResolvedValue([{ result_code: 'RC' }]);
    existsSync.mockReturnValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StarResultsMetadataWorkbookHandler,
        WorkbookSheetOrderResolver,
        {
          provide: ReportLayoutRepository,
          useValue: {
            findActiveSheets,
            findDataDictionaryRows,
            findColumnGroups,
          },
        },
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

  it('builds workbook spec with DB column groups and fetched logo', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      headers: { get: () => 'image/png' },
    });
    const spec = await handler.buildWorkbookSpec(baseFilters);
    expect(spec.sheets).toHaveLength(2);
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
    expect(raw!.columns).toHaveLength(54);
    expect(
      raw!.columns.find((c) => c.key === 'training_engagement_report')?.header,
    ).toBe('Training type');
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
    const ws = wb.getWorksheet('Raw');
    expect(ws).toBeDefined();
    const yearCol =
      raw.columns.findIndex((c) => c.key === 'reporting_year') + 1;
    const dateCol = raw.columns.findIndex((c) => c.key === 'creation_date') + 1;
    const dataRow = ws!.getRow(5);
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
    const cell = wb.getWorksheet('Raw')!.getRow(5).getCell(col);
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

  it('uses fallback column groups when DB returns none', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1]).buffer,
      headers: { get: () => 'image/png' },
    });
    findColumnGroups.mockResolvedValueOnce([]);
    const spec = await handler.buildWorkbookSpec(baseFilters);
    const raw = spec.sheets.find(
      (s) => s.sheetKey === STAR_RESULTS_METADATA_SHEET_KEYS.RAW_DATA,
    );
    expect(raw?.presentation?.columnGroups?.length).toBeGreaterThan(0);
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

  it('omits sheets not present in ordered metadata', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1]).buffer,
      headers: { get: () => 'image/png' },
    });
    findActiveSheets.mockResolvedValueOnce([
      {
        sheet_key: 'unknown',
        sheet_name: 'X',
        sort_order: 1,
      },
    ]);
    const spec = await handler.buildWorkbookSpec(baseFilters);
    expect(spec.sheets).toHaveLength(0);
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

  it('uses default header fill when DB column group has null fill_argb', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1]).buffer,
      headers: { get: () => 'image/png' },
    });
    findColumnGroups.mockResolvedValueOnce([
      {
        from_col: 1,
        to_col: 33,
        label: 'All',
        fill_argb: null as unknown as string,
      },
    ]);
    const spec = await handler.buildWorkbookSpec(baseFilters);
    const raw = spec.sheets.find(
      (s) => s.sheetKey === STAR_RESULTS_METADATA_SHEET_KEYS.RAW_DATA,
    );
    expect(raw?.columns?.[0]?.headerFillArgb).toBe('FF1565C0');
  });
});
