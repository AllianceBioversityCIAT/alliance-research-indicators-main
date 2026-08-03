export const WHATS_NEW_LAST_SEEN_KEY = 'star-whats-new-last-seen';

/** Featured row at the top of the home page (3 columns on 2xl+). */
export const WHATS_NEW_LATEST_COUNT = 3;
export const WHATS_NEW_LATEST_COMPACT_COUNT = 2;

/** Matches Tailwind `2xl` — archive grid uses 4 columns from this width up. */
export const WHATS_NEW_ARCHIVE_FOUR_COLUMNS_MIN_WIDTH = '1536px';

/** Archive grid below the featured section. */
export const WHATS_NEW_ARCHIVE_COLUMNS = 4;
export const WHATS_NEW_ARCHIVE_INITIAL_ROWS = 5;
export const WHATS_NEW_ARCHIVE_LOAD_MORE_ROWS = 5;

export const WHATS_NEW_ARCHIVE_INITIAL_SIZE =
  WHATS_NEW_ARCHIVE_INITIAL_ROWS * WHATS_NEW_ARCHIVE_COLUMNS;
export const WHATS_NEW_ARCHIVE_LOAD_MORE_SIZE =
  WHATS_NEW_ARCHIVE_LOAD_MORE_ROWS * WHATS_NEW_ARCHIVE_COLUMNS;

/** Minimum items to load from the API before the first paint (3 latest + 5 rows × 4 cols). */
export const WHATS_NEW_INITIAL_FETCH_COUNT = WHATS_NEW_LATEST_COUNT + WHATS_NEW_ARCHIVE_INITIAL_SIZE;
