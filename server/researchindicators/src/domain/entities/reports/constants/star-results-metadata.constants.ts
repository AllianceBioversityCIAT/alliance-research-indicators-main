import type { WorkbookSheetRow } from '../core/excel-workbook.types';

export const STAR_RESULTS_METADATA_WORKBOOK_KEY = 'star_results_metadata';

export const STAR_RESULTS_METADATA_SHEET_KEYS = {
  DATA_DICTIONARY: 'data_dictionary',
  RAW_DATA: 'raw_data',
} as const;

/** Default sheet list (requirements §1). Order can still be overridden by env. */
export const STAR_RESULTS_METADATA_SHEETS: WorkbookSheetRow[] = [
  {
    sheet_key: STAR_RESULTS_METADATA_SHEET_KEYS.RAW_DATA,
    sheet_name: 'Raw data',
    sort_order: 1,
  },
  {
    sheet_key: STAR_RESULTS_METADATA_SHEET_KEYS.DATA_DICTIONARY,
    sheet_name: 'Data dictionary',
    sort_order: 2,
  },
];

/** Optional comma-separated `sheet_key` list to override tab order (left to right). */
export const STAR_RESULTS_METADATA_SHEET_ORDER_ENV =
  'ARI_STAR_RESULTS_METADATA_SHEET_ORDER';

/** Raw-data sheet header logo; override with `ARI_STAR_RESULTS_HEADER_LOGO_URL`. */
export const STAR_RESULTS_METADATA_HEADER_LOGO_URL =
  process.env.ARI_STAR_RESULTS_HEADER_LOGO_URL?.trim() ?? '';
