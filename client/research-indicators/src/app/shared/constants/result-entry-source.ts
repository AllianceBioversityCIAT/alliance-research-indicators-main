export const RESULT_ENTRY_SOURCE_QUERY = 'from';
export const RESULT_ENTRY_SOURCE_VALUE_RESULTS_CENTER = 'results-center';
/** User opened the result from the Home dashboard (e.g. My latest results). */
export const RESULT_ENTRY_SOURCE_VALUE_HOME = 'home';

/** Navigating from published OICR modal "Edit" into the full result form (skip modal resolver). */
export const OICR_FULL_EDIT_QUERY = 'oicrFullEdit';
export const OICR_FULL_EDIT_VALUE = '1';

export function getResultEntrySourceFromSearch(search: string): string | null {
  if (!search) return null;
  const q = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(q).get(RESULT_ENTRY_SOURCE_QUERY);
}

export function isResultsCenterEntryFromUrl(url: string): boolean {
  const i = url.indexOf('?');
  if (i < 0) return false;
  return getResultEntrySourceFromSearch(url.slice(i)) === RESULT_ENTRY_SOURCE_VALUE_RESULTS_CENTER;
}

export function isHomeEntryFromUrl(url: string): boolean {
  const i = url.indexOf('?');
  if (i < 0) return false;
  return getResultEntrySourceFromSearch(url.slice(i)) === RESULT_ENTRY_SOURCE_VALUE_HOME;
}
