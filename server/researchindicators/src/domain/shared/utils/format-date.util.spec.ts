import {
  FileDateFormat,
  formatDateForFileName,
  formatIsoDateForFileName,
} from './format-date.util';

describe('formatDateForFileName', () => {
  const date = new Date('2025-06-19T15:30:00.000Z');

  it('formats a date as YYYY-MM-DD in UTC by default', () => {
    expect(formatDateForFileName(date)).toBe('2025-06-19');
  });

  it('formats a date as YYYY-MM-DD when ISO_DATE is requested', () => {
    expect(formatDateForFileName(date, FileDateFormat.ISO_DATE)).toBe(
      '2025-06-19',
    );
  });

  it('formats a date as YYYYMMDD when COMPACT is requested', () => {
    expect(formatDateForFileName(date, FileDateFormat.COMPACT)).toBe(
      '20250619',
    );
  });

  it('formats a date as YYYYMMDD_HHmm when COMPACT_DATETIME is requested', () => {
    const datetime = new Date('2026-06-22T18:35:00.000Z');

    expect(
      formatDateForFileName(datetime, FileDateFormat.COMPACT_DATETIME),
    ).toBe('20260622_1835');
  });

  it('defaults to the current date when no argument is provided', () => {
    const now = new Date();

    expect(formatDateForFileName()).toBe(now.toISOString().slice(0, 10));
  });
});

describe('formatIsoDateForFileName', () => {
  it('keeps backward compatibility with ISO_DATE format', () => {
    const date = new Date('2025-06-19T15:30:00.000Z');

    expect(formatIsoDateForFileName(date)).toBe('2025-06-19');
  });
});
