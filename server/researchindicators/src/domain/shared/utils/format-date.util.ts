export enum FileDateFormat {
  /** ISO 8601 date-only, e.g. `2025-06-19` */
  ISO_DATE = 'YYYY-MM-DD',
  /** Compact date without separators, e.g. `20250619` */
  COMPACT = 'YYYYMMDD',
  /** Compact date and time, e.g. `20250619_1835` */
  COMPACT_DATETIME = 'YYYYMMDD_HHmm',
}

const formatUtcDateParts = (
  date: Date,
): { year: string; month: string; day: string } => ({
  year: String(date.getUTCFullYear()),
  month: String(date.getUTCMonth() + 1).padStart(2, '0'),
  day: String(date.getUTCDate()).padStart(2, '0'),
});

const formatUtcTimeParts = (
  date: Date,
): { hours: string; minutes: string } => ({
  hours: String(date.getUTCHours()).padStart(2, '0'),
  minutes: String(date.getUTCMinutes()).padStart(2, '0'),
});

/**
 * Formats a date for use in file names (UTC).
 *
 * All formats are lexicographically sortable and filesystem-safe.
 */
export const formatDateForFileName = (
  date: Date = new Date(),
  format: FileDateFormat = FileDateFormat.ISO_DATE,
): string => {
  const { year, month, day } = formatUtcDateParts(date);

  switch (format) {
    case FileDateFormat.COMPACT:
      return `${year}${month}${day}`;
    case FileDateFormat.COMPACT_DATETIME: {
      const { hours, minutes } = formatUtcTimeParts(date);
      return `${year}${month}${day}_${hours}${minutes}`;
    }
    case FileDateFormat.ISO_DATE:
    default:
      return `${year}-${month}-${day}`;
  }
};

/** Alias for `formatDateForFileName(date, FileDateFormat.ISO_DATE)`. */
export const formatIsoDateForFileName = (date: Date = new Date()): string =>
  formatDateForFileName(date, FileDateFormat.ISO_DATE);
