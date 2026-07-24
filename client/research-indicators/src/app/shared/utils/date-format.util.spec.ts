import type { DateFormatJsonValue } from '@shared/interfaces/date-format-config.interface';
import {
  formatUtcToCet,
  formatUtcToCetDisplay,
  formatUtcWithConfig,
  formatUtcWithConfigParts,
  getCalendarFormatsFromConfig,
  getLocalDateAndTime,
  getUtcDateAndTime,
  getTimezoneLabelForEdit,
  isConfigCetCest,
  localDateAndTimeToUtc,
  cetCestLocalToUtc,
  tzLabelFromResolved
} from './date-format.util';

function configWithTimezone(overrides: Partial<DateFormatJsonValue> = {}): DateFormatJsonValue {
  return {
    locale: 'en-GB',
    timezone: { iana: 'Europe/Paris', displayName: 'CET', abbreviationMode: 'short' },
    date: {
      style: 'short',
      order: 'DMY',
      separator: '/',
      twoDigitDay: true,
      twoDigitMonth: true,
      fourDigitYear: true,
      monthName: { enabled: false, format: 'short', uppercase: false }
    },
    time: { hour12: true, twoDigitMinute: true },
    display: { order: 'dateFirst', separator: ' at ', suffix: { enabled: true, style: 'short', fallback: 'CET', wrap: 'PAREN' } },
    ...overrides
  } as DateFormatJsonValue;
}

describe('date-format.util', () => {
  describe('formatUtcToCet', () => {
    it('should return date and time in CET for UTC string', () => {
      const result = formatUtcToCet('2026-02-26T21:43:03.683Z');
      expect(result).not.toBeNull();
      expect(result!.date).toBeDefined();
      expect(result!.time).toBeDefined();
    });

    it('should return null for null input', () => {
      expect(formatUtcToCet(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(formatUtcToCet(undefined)).toBeNull();
    });

    it('should return null for invalid date string', () => {
      expect(formatUtcToCet('invalid')).toBeNull();
    });

    it('should handle Date input', () => {
      const result = formatUtcToCet(new Date('2026-02-26T12:00:00.000Z'));
      expect(result).not.toBeNull();
    });

    it('should return null for NaN Date', () => {
      expect(formatUtcToCet(new Date('invalid'))).toBeNull();
    });

    it('should normalize string without Z by appending Z', () => {
      const result = formatUtcToCet('2026-02-26T21:43:03.683');
      expect(result).not.toBeNull();
      expect(result!.date).toBeDefined();
      expect(result!.time).toBeDefined();
    });
  });

  describe('formatUtcToCetDisplay', () => {
    it('should return "date at time (CET)" for valid input', () => {
      const result = formatUtcToCetDisplay('2026-02-26T21:43:03.683Z');
      expect(result).toContain(' at ');
      expect(result).toContain('(CET)');
    });

    it('should return null when formatUtcToCet returns null (cover lines 44-46)', () => {
      expect(formatUtcToCetDisplay(null)).toBeNull();
      expect(formatUtcToCetDisplay(undefined)).toBeNull();
      expect(formatUtcToCetDisplay('invalid')).toBeNull();
    });
  });

  describe('getLocalDateAndTime', () => {
    it('should return local (CET/CEST) date and time for valid UTC Date', () => {
      const utc = new Date('2026-02-26T12:00:00.000Z');
      const result = getLocalDateAndTime(utc);
      expect(result).not.toBeNull();
      expect(result!.date).toBeInstanceOf(Date);
      expect(result!.time).toBeInstanceOf(Date);
      expect(result!.date.getFullYear()).toBeGreaterThanOrEqual(2025);
      expect(result!.time.getHours()).toBeGreaterThanOrEqual(0);
    });

    it('should return null for NaN Date (cover line 59)', () => {
      expect(getLocalDateAndTime(new Date('invalid'))).toBeNull();
    });

    it('should use fallback 0 when a part type is missing (cover ?? 0 branch in get)', () => {
      const utc = new Date('2026-02-26T12:00:00.000Z');
      const formatToPartsSpy = jest.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts').mockReturnValueOnce([
        { type: 'year', value: '2026' },
        { type: 'month', value: '02' },
        { type: 'day', value: '26' },
        { type: 'hour', value: '13' }
        // omit 'minute' so get('minute') returns undefined and we use '0'
      ] as Intl.DateTimeFormatPart[]);
      const result = getLocalDateAndTime(utc);
      expect(result).not.toBeNull();
      expect(result!.time.getMinutes()).toBe(0);
      formatToPartsSpy.mockRestore();
    });
  });

  describe('cetCestLocalToUtc', () => {
    it('should convert local (CET/CEST) date and time to UTC Date', () => {
      const date = new Date(2026, 0, 15);
      const time = new Date(0, 0, 0, 14, 30, 0);
      const utc = cetCestLocalToUtc(date, time);
      expect(utc).toBeInstanceOf(Date);
      expect(Number.isNaN(utc.getTime())).toBe(false);
    });

    it('should handle midnight', () => {
      const date = new Date(2026, 5, 1);
      const time = new Date(0, 0, 0, 0, 0, 0);
      const utc = cetCestLocalToUtc(date, time);
      expect(utc).toBeInstanceOf(Date);
    });

    it('should handle single-digit hour and minute (padStart branches)', () => {
      const date = new Date(2026, 0, 5);
      const time = new Date(0, 0, 0, 9, 5, 0);
      const utc = cetCestLocalToUtc(date, time);
      expect(utc).toBeInstanceOf(Date);
      expect(utc.getUTCHours()).toBeDefined();
    });
  });

  describe('formatUtcWithConfig', () => {
    it('returns formatUtcToUtcDisplay when config or config.timezone is null', () => {
      const raw = '2026-02-26T12:00:00.000Z';
      expect(formatUtcWithConfig(raw, null)).toContain('(UTC)');
      expect(formatUtcWithConfig(raw, { timezone: null } as unknown as DateFormatJsonValue)).toContain('(UTC)');
    });

    it('returns formatted string with config (CET/CEST path)', () => {
      const config = configWithTimezone();
      const result = formatUtcWithConfig('2026-02-26T12:00:00.000Z', config);
      expect(result).toBeDefined();
      expect(result).toContain(' at ');
    });

    it('returns null for null or invalid raw', () => {
      expect(formatUtcWithConfig(null, configWithTimezone())).toBeNull();
      expect(formatUtcWithConfig('invalid', configWithTimezone())).toBeNull();
    });

    it('uses locale and separator from config', () => {
      const config = configWithTimezone({
        locale: 'en-GB',
        display: {
          order: 'dateFirst',
          separator: ' - ',
          suffix: { enabled: false, style: 'short', fallback: '', wrap: 'NONE' }
        } as DateFormatJsonValue['display']
      });
      const result = formatUtcWithConfig('2026-02-26T12:00:00.000Z', config);
      expect(result).toContain(' - ');
    });

    it('uses UTC label when config timezone resolves to UTC', () => {
      const configUtc = configWithTimezone({ timezone: { iana: 'America/New_York', displayName: 'EST', abbreviationMode: 'short' } });
      const result = formatUtcWithConfig('2026-02-26T12:00:00.000Z', configUtc);
      expect(result).toContain('(UTC)');
    });

    it('uses default locale and separator when missing', () => {
      const config = configWithTimezone();
      delete (config as Record<string, unknown>).locale;
      const result = formatUtcWithConfig('2026-02-26T12:00:00.000Z', config);
      expect(result).toContain(' at ');
    });

    it('uses default separator when config.display is undefined', () => {
      const config = configWithTimezone();
      (config as Record<string, unknown>).display = undefined;
      const result = formatUtcWithConfig('2026-02-26T12:00:00.000Z', config);
      expect(result).toContain(' at ');
    });
  });

  describe('formatUtcWithConfigParts', () => {
    it('returns UTC parts when config?.timezone is null', () => {
      const result = formatUtcWithConfigParts('2026-02-26T12:00:00.000Z', null);
      expect(result).not.toBeNull();
      expect(result!.timezoneLabel).toBe('UTC');
      expect(result!.date).toBeDefined();
      expect(result!.time).toBeDefined();
    });

    it('returns parts with timezoneLabel when config has timezone (CET/CEST)', () => {
      const config = configWithTimezone();
      const result = formatUtcWithConfigParts('2026-02-26T12:00:00.000Z', config);
      expect(result).not.toBeNull();
      expect(['CET', 'CEST']).toContain(result!.timezoneLabel);
    });

    it('returns parts with UTC when config timezone resolves to UTC', () => {
      const configUtc = configWithTimezone({ timezone: { iana: 'America/New_York', displayName: 'EST', abbreviationMode: 'short' } });
      const result = formatUtcWithConfigParts('2026-02-26T12:00:00.000Z', configUtc);
      expect(result).not.toBeNull();
      expect(result!.timezoneLabel).toBe('UTC');
    });

    it('returns parts with tzLabel from getTimezoneAbbr when tz is not UTC', () => {
      const config = configWithTimezone();
      const result = formatUtcWithConfigParts('2026-07-15T10:00:00.000Z', config);
      expect(result).not.toBeNull();
      expect(['CET', 'CEST']).toContain(result!.timezoneLabel);
    });

    it('returns null for invalid raw', () => {
      expect(formatUtcWithConfigParts(null, configWithTimezone())).toBeNull();
    });

    it('uses default locale when config.locale is undefined', () => {
      const config = configWithTimezone();
      delete (config as Record<string, unknown>).locale;
      const result = formatUtcWithConfigParts('2026-02-26T12:00:00.000Z', config);
      expect(result).not.toBeNull();
      expect(result!.date).toBeDefined();
    });
  });

  describe('re-exports (getUtcDateAndTime, getTimezoneLabelForEdit, isConfigCetCest, localDateAndTimeToUtc)', () => {
    it('getUtcDateAndTime returns UTC date/time', () => {
      const r = getUtcDateAndTime(new Date('2026-02-26T12:00:00.000Z'));
      expect(r).not.toBeNull();
    });

    it('getTimezoneLabelForEdit returns UTC or CET/CEST from config', () => {
      expect(getTimezoneLabelForEdit(null)).toBe('UTC');
      expect(['CET', 'CEST']).toContain(getTimezoneLabelForEdit(configWithTimezone()));
    });

    it('isConfigCetCest returns true for CET config', () => {
      expect(isConfigCetCest(configWithTimezone())).toBe(true);
    });

    it('localDateAndTimeToUtc converts with config', () => {
      const d = new Date(2026, 0, 15);
      const t = new Date(0, 0, 0, 12, 0, 0);
      expect(localDateAndTimeToUtc(d, t, configWithTimezone())).toBeInstanceOf(Date);
      expect(localDateAndTimeToUtc(d, t, null)).toBeInstanceOf(Date);
    });
  });

  describe('tzLabelFromResolved', () => {
    it('returns UTC when tz is UTC', () => {
      expect(tzLabelFromResolved('UTC', new Date())).toBe('UTC');
    });
    it('returns getTimezoneAbbr when tz is not UTC', () => {
      const result = tzLabelFromResolved('Europe/Paris', new Date('2026-02-26T12:00:00.000Z'));
      expect(['CET', 'CEST']).toContain(result);
    });
  });

  describe('getCalendarFormatsFromConfig', () => {
    it('returns dateFormat, hourFormat, timeFormat', () => {
      const config = configWithTimezone();
      const result = getCalendarFormatsFromConfig(config);
      expect(result).toHaveProperty('dateFormat');
      expect(result).toHaveProperty('hourFormat');
      expect(result).toHaveProperty('timeFormat');
      expect(['12', '24']).toContain(result.hourFormat);
    });

    it('returns defaults when config is null', () => {
      const result = getCalendarFormatsFromConfig(null);
      expect(result.dateFormat).toBe('dd/mm/yy');
      expect(result.hourFormat).toBe('12');
    });
  });
});
