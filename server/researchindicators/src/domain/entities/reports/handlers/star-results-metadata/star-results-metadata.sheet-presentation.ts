import type { ExcelSheetPreamble } from '../../core/excel-workbook.types';

/** Default title row / logo title strip (used when column group has no DB color). */
export const STAR_RAW_SHEET_HEADER_FILL_ARGB = 'FF1F4E79';
export const STAR_RAW_SHEET_HEADER_FONT_ARGB = 'FFFFFFFF';

/** Row 1 “ALLIANCE RESULTS”: white strip, Alliance blue text (matches GENERAL INFORMATION tone). */
export const STAR_RAW_BANNER_TITLE_FILL_ARGB = 'FFFFFFFF';
export const STAR_RAW_BANNER_TITLE_FONT_ARGB = 'FF203C61';

/**
 * DrawingML: 12 pt upward (matches design panel Y = -12 pt).
 * 914400 EMU = 1 in; 72 pt = 1 in.
 */
export const STAR_RAW_LOGO_ROW_OFF_EMU = -Math.round((12 / 72) * 914400);

/** Logo size from design: 180×76 pt → px at 96dpi (ExcelJS `ext`). */
export const STAR_RAW_LOGO_EXT_PX = {
  width: Math.round((180 * 96) / 72),
  height: Math.round((76 * 96) / 72),
};

/**
 * Fallback column groups if `report_workbook_column_group` has no rows (e.g. migration pending).
 */
export const STAR_RAW_COLUMN_GROUP_FALLBACK: Array<{
  fromCol: number;
  toCol: number;
  label: string;
  fillArgb: string;
}> = [
  { fromCol: 1, toCol: 14, label: 'GENERAL INFORMATION', fillArgb: 'FF203C61' },
  { fromCol: 15, toCol: 22, label: 'ALLIANCE ALIGNMENT', fillArgb: 'FF2A4783' },
  { fromCol: 23, toCol: 23, label: 'PARTNERS', fillArgb: 'FF325B94' },
  { fromCol: 24, toCol: 27, label: 'GEOGRAPHIC SCOPE', fillArgb: 'FF5A91D3' },
  { fromCol: 28, toCol: 28, label: 'EVIDENCES', fillArgb: 'FF64B1DD' },
  {
    fromCol: 29,
    toCol: 29,
    label: 'LINK TO RESULT',
    fillArgb: 'FF7E57C2',
  },
  { fromCol: 30, toCol: 34, label: 'IP RIGHTS', fillArgb: 'FF35749A' },
  {
    fromCol: 35,
    toCol: 55,
    label: 'CAPSHARING DETAILS',
    fillArgb: 'FF4D7C31',
  },
  {
    fromCol: 56,
    toCol: 59,
    label: 'POLICY DETAILS',
    fillArgb: 'FFDA7842',
  },
  {
    fromCol: 60,
    toCol: 73,
    label: 'OICR DETAILS',
    fillArgb: 'FFD9A041',
  },
];

/** Preamble without column groups (groups come from DB or fallback in the handler). */
export const STAR_RAW_SHEET_PREAMBLE_BASE: Omit<
  ExcelSheetPreamble,
  'columnGroups'
> = {
  bannerTitle: 'ALLIANCE RESULTS',
  bannerTitleHorizontalAlign: 'left',
  bannerTitleFillArgb: STAR_RAW_BANNER_TITLE_FILL_ARGB,
  bannerTitleFontArgb: STAR_RAW_BANNER_TITLE_FONT_ARGB,
  bannerTitleMergeFromCol: 3,
  bannerTitleMergeToCol: 73,
  logoMergeFromCol: 1,
  logoMergeToCol: 2,
  /** Row 1 only so row 2 subtitle merge does not overlap the logo merge. */
  logoMergeToRow: 1,
  logoExtPx: STAR_RAW_LOGO_EXT_PX,
  logoTlEmu: { nativeColOff: 0, nativeRowOff: STAR_RAW_LOGO_ROW_OFF_EMU },
  logoEditAs: 'absolute',
  headerFillArgb: STAR_RAW_SHEET_HEADER_FILL_ARGB,
  headerFontArgb: STAR_RAW_SHEET_HEADER_FONT_ARGB,
};
