import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { extname, join } from 'path';
import { env } from 'process';
import type {
  ExcelColumnSpec,
  ExcelSheetSpec,
  ExcelWorkbookSpec,
  ReportWorkbookHandler,
} from '../../core/excel-workbook.types';

import { deriveColumnGroups } from '../../core/excel-workbook.column-groups';
import { WorkbookSheetOrderResolver } from '../../core/workbook-sheet-order.resolver';
import { StarResultsExportRepository } from '../../repositories/star-results-export.repository';
import {
  STAR_RESULTS_METADATA_DICTIONARY_COLUMNS,
  STAR_RESULTS_METADATA_RAW_COLUMNS,
} from './star-results-metadata.columns';
import {
  STAR_RESULTS_METADATA_DICTIONARY_ROWS,
  type StarDictionaryRow,
} from './star-results-metadata.dictionary';
import {
  STAR_RESULTS_METADATA_HEADER_LOGO_URL,
  STAR_RESULTS_METADATA_SHEET_KEYS,
  STAR_RESULTS_METADATA_SHEET_ORDER_ENV,
  STAR_RESULTS_METADATA_SHEETS,
  STAR_RESULTS_METADATA_WORKBOOK_KEY,
} from '../../constants/star-results-metadata.constants';
import { buildStarRawBannerSubtitle } from './star-results-metadata.banner-subtitle';
import { STAR_RAW_SHEET_PREAMBLE_BASE } from './star-results-metadata.sheet-presentation';
import {
  STAR_RAW_SECTIONS,
  type StarRawSectionColumn,
} from './star-results-metadata.sections';
import { FullFiltersReportDto } from '../../dto/filters-report.dto';

const HEADER_LOGO_CANDIDATE = join(
  __dirname,
  '../../assets/report-header-logo.png',
);

const DICTIONARY_ROW_FILL = '_rowFillArgb';

@Injectable()
export class StarResultsMetadataWorkbookHandler
  implements ReportWorkbookHandler
{
  readonly workbookKey = STAR_RESULTS_METADATA_WORKBOOK_KEY;
  readonly sheetOrderEnvVarName = STAR_RESULTS_METADATA_SHEET_ORDER_ENV;

  constructor(
    private readonly starExportRepository: StarResultsExportRepository,
    private readonly sheetOrderResolver: WorkbookSheetOrderResolver,
  ) {}

  async buildWorkbookSpec(
    filters: FullFiltersReportDto,
  ): Promise<ExcelWorkbookSpec> {
    const csvOverride = this.sheetOrderEnvVarName
      ? env[this.sheetOrderEnvVarName]
      : undefined;
    const orderedSheets = this.sheetOrderResolver.resolve(
      STAR_RESULTS_METADATA_SHEETS,
      csvOverride,
    );

    const rawRows =
      await this.starExportRepository.findStarResultsMetadataRows(filters);

    const { columnGroups, lastColumn } = deriveColumnGroups(
      STAR_RESULTS_METADATA_RAW_COLUMNS,
      STAR_RAW_SECTIONS,
    );
    const rawColumns = this.withHeaderFills(
      STAR_RESULTS_METADATA_RAW_COLUMNS.map((c) => ({ ...c })),
    );
    const headerLogo = await this.resolveHeaderLogoImage();

    const dictionarySheet: ExcelSheetSpec = {
      sheetKey: STAR_RESULTS_METADATA_SHEET_KEYS.DATA_DICTIONARY,
      name: 'Data dictionary',
      columns: STAR_RESULTS_METADATA_DICTIONARY_COLUMNS.map((c) => ({ ...c })),
      rows: this.mapDictionaryRows(STAR_RESULTS_METADATA_DICTIONARY_ROWS),
      rowFillArgbField: DICTIONARY_ROW_FILL,
    };

    const rawSheet: ExcelSheetSpec = {
      sheetKey: STAR_RESULTS_METADATA_SHEET_KEYS.RAW_DATA,
      name: 'Raw data',
      columns: rawColumns,
      rows: rawRows,
      presentation: {
        ...STAR_RAW_SHEET_PREAMBLE_BASE,
        bannerTitleMergeToCol: lastColumn,
        columnGroups,
        bannerSubtitle: buildStarRawBannerSubtitle(filters.filters),
        ...(headerLogo ? { logoImage: headerLogo } : { logoPath: undefined }),
      },
    };

    const byKey = new Map<string, ExcelSheetSpec>([
      [STAR_RESULTS_METADATA_SHEET_KEYS.DATA_DICTIONARY, dictionarySheet],
      [STAR_RESULTS_METADATA_SHEET_KEYS.RAW_DATA, rawSheet],
    ]);

    const sheets: ExcelSheetSpec[] = [];
    for (const meta of orderedSheets) {
      const built = byKey.get(meta.sheet_key);
      if (built) {
        built.name = meta.sheet_name;
        sheets.push(built);
      }
    }

    return { sheets };
  }

  private async resolveHeaderLogoImage(): Promise<
    { buffer: Buffer; extension: 'png' | 'jpeg' | 'gif' } | undefined
  > {
    try {
      const res = await fetch(STAR_RESULTS_METADATA_HEADER_LOGO_URL);
      if (!res.ok) {
        return this.readBundledHeaderLogo();
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0) {
        return this.readBundledHeaderLogo();
      }
      const ct = (res.headers.get('content-type') ?? '').toLowerCase();
      const extension: 'png' | 'jpeg' | 'gif' = ct.includes('gif')
        ? 'gif'
        : ct.includes('jpeg') || ct.includes('jpg')
          ? 'jpeg'
          : 'png';
      return { buffer: buf, extension };
    } catch {
      return this.readBundledHeaderLogo();
    }
  }

  private readBundledHeaderLogo():
    | { buffer: Buffer; extension: 'png' | 'jpeg' | 'gif' }
    | undefined {
    if (!existsSync(HEADER_LOGO_CANDIDATE)) {
      return undefined;
    }
    const ext = extname(HEADER_LOGO_CANDIDATE).toLowerCase();
    const extension: 'png' | 'jpeg' | 'gif' =
      ext === '.jpg' || ext === '.jpeg'
        ? 'jpeg'
        : ext === '.gif'
          ? 'gif'
          : 'png';
    return {
      buffer: readFileSync(HEADER_LOGO_CANDIDATE),
      extension,
    };
  }

  private withHeaderFills(
    columns: readonly StarRawSectionColumn[],
  ): ExcelColumnSpec[] {
    return columns.map((col) => ({
      ...col,
      headerFillArgb: STAR_RAW_SECTIONS[col.section].fillArgb,
    }));
  }

  private mapDictionaryRows(
    rows: readonly StarDictionaryRow[],
  ): Record<string, unknown>[] {
    let current = 'FFECEFF1';
    return rows.map((r) => {
      if (r.section_fill_argb) {
        current = r.section_fill_argb;
      }
      return {
        section: r.section ?? '',
        field_label: r.field_label,
        explanation: r.explanation ?? '',
        [DICTIONARY_ROW_FILL]: current,
      };
    });
  }
}
