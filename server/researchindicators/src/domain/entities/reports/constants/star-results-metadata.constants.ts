export const STAR_RESULTS_METADATA_WORKBOOK_KEY = 'star_results_metadata';

export const STAR_RESULTS_METADATA_SHEET_KEYS = {
  DATA_DICTIONARY: 'data_dictionary',
  RAW_DATA: 'raw_data',
} as const;

/** Optional comma-separated `sheet_key` list to override tab order (left to right). */
export const STAR_RESULTS_METADATA_SHEET_ORDER_ENV =
  'ARI_STAR_RESULTS_METADATA_SHEET_ORDER';

/** Raw-data sheet header logo; override with `ARI_STAR_RESULTS_HEADER_LOGO_URL`. */
export const STAR_RESULTS_METADATA_HEADER_LOGO_URL =
  process.env.ARI_STAR_RESULTS_HEADER_LOGO_URL?.trim() ?? '';
