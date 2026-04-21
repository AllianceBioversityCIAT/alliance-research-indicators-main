import { FullFiltersReportDto } from "../dto/filters-report.dto";

export type ExcelHyperlinkColumnSpec = {
  urlField: string;
  /** When URL is valid, shown text (falls back to URL). */
  displayField?: string;
  /** When URL is missing or invalid. */
  emptyDisplay?: string;
};

export type ExcelColumnSpec = {
  key: string;
  header: string;
  width?: number;
  /** When set, used for the main header row background (e.g. per raw-data section). */
  headerFillArgb?: string;
  hyperlink?: ExcelHyperlinkColumnSpec;
};

/** Optional merged banner / subtitle / column-group row before the main header row. */
export type ExcelSheetPreamble = {
  bannerTitle: string;
  /** Merge range for the main title (1-based column indexes, row 1). */
  bannerTitleMergeFromCol: number;
  bannerTitleMergeToCol: number;
  /** Alignment of `bannerTitle` inside the merged title cell (row 1). Default: right. */
  bannerTitleHorizontalAlign?: 'left' | 'center' | 'right';
  /**
   * Row 1 title cell background (ARGB). When omitted, falls back to `headerFillArgb`.
   * Use `FFFFFFFF` for white.
   */
  bannerTitleFillArgb?: string;
  /**
   * Row 1 title text color (ARGB). When omitted, falls back to `headerFontArgb`.
   */
  bannerTitleFontArgb?: string;
  /** Optional absolute path to a PNG/JPEG file on disk (server). */
  logoPath?: string;
  /**
   * In-memory image (e.g. fetched from CDN). When set and non-empty, takes precedence over `logoPath`.
   */
  logoImage?: {
    buffer: Buffer;
    extension: 'png' | 'jpeg' | 'gif';
  };
  /** Merge range for logo (1-based columns, rows 1–logoMergeToRow). */
  logoMergeFromCol?: number;
  logoMergeToCol?: number;
  logoMergeToRow?: number;
  /** Logo `ext` width/height in px at 96dpi (ExcelJS / DrawingML). */
  logoExtPx?: { width: number; height: number };
  /** Top-left anchor offsets in EMU (`rowOff` negative moves image upward). */
  logoTlEmu?: { nativeColOff?: number; nativeRowOff?: number };
  /** Drawing anchor editAs (default `oneCell`). */
  logoEditAs?: 'oneCell' | 'absolute' | 'twoCell';
  /** Subtitle row (row 2), full-width merge. */
  bannerSubtitle?: string;
  /** Group header row (row 3): merged regions with labels and section background colors. */
  columnGroups: Array<{
    fromCol: number;
    toCol: number;
    label: string;
    fillArgb: string;
  }>;
  headerFillArgb?: string;
  headerFontArgb?: string;
};

export type ExcelSheetSpec = {
  /** Logical id (e.g. matches report_workbook_sheet.sheet_key). */
  sheetKey?: string;
  /** Excel tab title. */
  name: string;
  columns: ExcelColumnSpec[];
  rows: Record<string, unknown>[];
  /** When set, rows 1–3 are reserved for banner, subtitle, and column groups; headers start on row 4. */
  presentation?: ExcelSheetPreamble;
  /**
   * When set, each data row may include this key with an ARGB string (e.g. `FF1565C0`);
   * all cells in that row get that fill (Data dictionary section colors).
   */
  rowFillArgbField?: string;
};

export type ExcelWorkbookSpec = {
  sheets: ExcelSheetSpec[];
};

export type WorkbookSheetRow = {
  sheet_key: string;
  sheet_name: string;
  sort_order: number;
};

export type ReportWorkbookHandler = {
  readonly workbookKey: string;
  /** Env var name for comma-separated sheet_key override, or null. */
  readonly sheetOrderEnvVarName: string | null;
  buildWorkbookSpec(filters: FullFiltersReportDto): Promise<ExcelWorkbookSpec>;
};
