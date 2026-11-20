import { Injectable } from '@nestjs/common';
import {
  AutomapperService,
  PendingMappingExportRow,
} from '../../bilateral-project-mapping/automapper.service';
import {
  BilateralMappingExportResult,
  BilateralMappingScienceProgram,
  BilateralProjectMappingService,
  MappedBilateralExportRow,
} from '../../bilateral-project-mapping/bilateral-project-mapping.service';
import { MappingSourceEnum } from '../../bilateral-project-mapping/enum/mapping-source.enum';
import { LoggerUtil } from '../../../shared/utils/logger.util';
import type {
  ExcelColumnSpec,
  ExcelSheetPreamble,
  ExcelWorkbookSpec,
} from '../core/excel-workbook.types';
import {
  STAR_RAW_BANNER_TITLE_FILL_ARGB,
  STAR_RAW_BANNER_TITLE_FONT_ARGB,
  STAR_RAW_SHEET_HEADER_FILL_ARGB,
  STAR_RAW_SHEET_HEADER_FONT_ARGB,
} from './star-results-metadata/star-results-metadata.sheet-presentation';
import { ExportBilateralMappingQueryDto } from '../dto/export-bilateral-mapping.query.dto';

// @akili-spec docs/specs/bilateral/mapping-filtered-export — T-04 /
// R-MFE-001, R-MFE-004, R-MFE-005, R-MFE-011, DD-2, DD-5, DD-9, DD-13.
//
// Row source is design §5. Pending goes to AutomapperService and its 503/422
// propagate. Every other status, including an unknown one, goes to the
// mapping export, which already ignores an unknown status the way list() does.
//
// The notice fires when clarisaAvailable is false or clarisaCohortEmpty is
// true (design §2.1, amended 2026-11-17). clarisaCohortEmpty is true only when
// CLARISA answered with an empty cohort. Zero rows from the filters are a
// valid file: header and no notice. A project missing from a healthy cohort
// is blank allocations and no notice.

const NOTICE_TEXT =
  'Science Program allocations and CLARISA names could not be loaded.';

const SOURCE_LABELS: Record<string, string> = {
  [MappingSourceEnum.MANUAL]: 'Manual',
  [MappingSourceEnum.DERIVED]: 'Derived',
  [MappingSourceEnum.AI_SUGGESTED]: 'AI Suggested',
  [MappingSourceEnum.AI_AUTO]: 'AI Auto',
};

const COLUMNS: ExcelColumnSpec[] = [
  { key: 'agreementId', header: 'Agreement ID (AGRESSO)', width: 28 },
  { key: 'agressoProjectName', header: 'Agresso project name', width: 36 },
  {
    key: 'clarisaProject',
    header: 'CLARISA Project (Bilateral)',
    width: 36,
  },
  {
    key: 'sciencePrograms',
    header: 'Science Program allocations',
    width: 36,
  },
  { key: 'source', header: 'Source', width: 16 },
  { key: 'status', header: 'Status', width: 14 },
  {
    key: 'reportingYear',
    header: 'Reporting year',
    width: 16,
    cellDataType: 'integer',
  },
  { key: 'justification', header: 'Status change justification', width: 36 },
  { key: 'notes', header: 'Notes', width: 28 },
  { key: 'statusChangedBy', header: 'Status changed by', width: 24 },
  {
    key: 'statusChangeDate',
    header: 'Status change date',
    width: 20,
    cellDataType: 'date',
  },
  {
    key: 'lastUpdated',
    header: 'Last Updated',
    width: 18,
    cellDataType: 'date',
  },
];

type SheetRow = Record<string, unknown>;

const blank = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim() === '' ? '' : value;
};

const projectLabel = (
  fullName: string | null | undefined,
  shortName: string | null | undefined,
  projectId: number | null | undefined,
): string => {
  const full = blank(fullName);
  if (full) return full;
  const short = blank(shortName);
  if (short) return short;
  if (
    projectId === undefined ||
    projectId === null ||
    Number.isNaN(projectId)
  ) {
    return '';
  }
  return `Project ${projectId}`;
};

const formatAllocations = (
  programs: BilateralMappingScienceProgram[] | null | undefined,
): string => {
  if (!programs || programs.length === 0) return '';
  return programs
    .map((program) => {
      const code = blank(program?.code);
      if (!code) return '';
      const allocation = program.allocation;
      if (typeof allocation === 'number' && Number.isFinite(allocation)) {
        return `${code} (${allocation}%)`;
      }
      return code;
    })
    .filter((part) => part !== '')
    .join('; ');
};

const sourceLabel = (source: string | null | undefined): string => {
  if (!source) return '';
  return SOURCE_LABELS[source] ?? '';
};

/** Date cell whose calendar day is the UTC day, so Excel's local numFmt matches UTC. */
const utcDateCell = (value: Date | string | null | undefined): Date | '' => {
  if (value === null || value === undefined || value === '') return '';
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Date(
    Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate(),
    ),
  );
};

const utcStamp = (now: Date): string => {
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${now.getUTCFullYear()}${month}${day}`;
};

@Injectable()
export class BilateralMappingWorkbookHandler {
  private readonly logger = new LoggerUtil({
    name: BilateralMappingWorkbookHandler.name,
  });

  constructor(
    private readonly mappingService: BilateralProjectMappingService,
    private readonly automapperService: AutomapperService,
  ) {}

  async build(query: ExportBilateralMappingQueryDto): Promise<{
    spec: ExcelWorkbookSpec;
    fileName: string;
  }> {
    const status = query.status?.trim().toLowerCase() ?? '';
    if (status === 'pending') {
      const result = await this.automapperService.exportPending(query);
      return this.finish(
        query,
        status,
        result,
        result.rows.map((row) => this.pendingRow(row, result.reportingYear)),
      );
    }

    const result = await this.mappingService.exportMappings(query);
    return this.finish(
      query,
      status,
      result,
      result.rows.map((row) => this.mappedRow(row)),
    );
  }

  private finish<TRow>(
    query: ExportBilateralMappingQueryDto,
    status: string,
    result: BilateralMappingExportResult<TRow>,
    rows: SheetRow[],
  ): { spec: ExcelWorkbookSpec; fileName: string } {
    const notice = !result.clarisaAvailable || result.clarisaCohortEmpty;
    const fileName = `Bilateral_Mapping_${result.reportingYear}_${utcStamp(new Date())}.xlsx`;
    this.logger._log(
      `status=${status || 'all'} rows=${result.rows.length} notice=${notice}`,
    );

    const presentation: ExcelSheetPreamble = {
      bannerTitle: 'BILATERAL MAPPING',
      bannerTitleHorizontalAlign: 'left',
      bannerTitleFillArgb: STAR_RAW_BANNER_TITLE_FILL_ARGB,
      bannerTitleFontArgb: STAR_RAW_BANNER_TITLE_FONT_ARGB,
      bannerTitleMergeFromCol: 1,
      bannerTitleMergeToCol: COLUMNS.length,
      headerFillArgb: STAR_RAW_SHEET_HEADER_FILL_ARGB,
      headerFontArgb: STAR_RAW_SHEET_HEADER_FONT_ARGB,
      bannerSubtitle: this.subtitle(query, status),
      columnGroups: [
        {
          fromCol: 1,
          toCol: COLUMNS.length,
          label: 'BILATERAL MAPPING',
          fillArgb: STAR_RAW_SHEET_HEADER_FILL_ARGB,
        },
      ],
      ...(notice ? { bannerNotice: { text: NOTICE_TEXT } } : {}),
    };

    return {
      fileName,
      spec: {
        sheets: [
          {
            name: 'Bilateral mapping',
            columns: COLUMNS,
            rows,
            presentation,
          },
        ],
      },
    };
  }

  private subtitle(
    query: ExportBilateralMappingQueryDto,
    status: string,
  ): string {
    const parts: string[] = [];
    const search = query.search?.trim();
    if (search) parts.push(`Search: ${search}`);
    if (status) parts.push(`Status: ${status}`);
    if (query.source && status !== 'pending') {
      parts.push(`Source: ${query.source}`);
    }
    const filters = parts.length > 0 ? parts.join(' | ') : 'none';
    return `Filters: ${filters}. Dates are in UTC.`;
  }

  private mappedRow(row: MappedBilateralExportRow): SheetRow {
    return {
      agreementId: blank(row.agresso_agreement_id),
      agressoProjectName: blank(row.agresso_description),
      clarisaProject: projectLabel(
        row.clarisa_project_full_name,
        row.clarisa_project_short_name,
        row.clarisa_project_id,
      ),
      sciencePrograms: formatAllocations(row.sciencePrograms),
      source: sourceLabel(row.source),
      status: row.is_active === false ? 'Inactive' : 'Mapped',
      reportingYear:
        typeof row.reporting_year === 'number' ? row.reporting_year : '',
      justification: blank(row.status_justification),
      notes: blank(row.notes),
      statusChangedBy: blank(row.status_changed_by_name),
      statusChangeDate: utcDateCell(row.status_changed_at),
      lastUpdated: utcDateCell(row.updated_at),
    };
  }

  private pendingRow(row: PendingMappingExportRow, year: number): SheetRow {
    return {
      agreementId: blank(row.derivedContractId),
      agressoProjectName: '',
      clarisaProject: projectLabel(
        row.clarisaProjectFullName,
        row.clarisaProjectShortName,
        row.clarisaProjectId,
      ),
      sciencePrograms: formatAllocations(row.sciencePrograms),
      source: 'Unmapped',
      status: 'Pending',
      reportingYear: year,
      justification: '',
      notes: '',
      statusChangedBy: '',
      statusChangeDate: '',
      lastUpdated: '',
    };
  }
}
