import type { DateFormatJsonValue } from '@shared/interfaces/date-format-config.interface';
import {
  cetCestLocalToUtc,
  formatUtcToUtcDisplay,
  getLocalDateAndTime,
  getResolvedTimezone,
  getTimezoneAbbr,
  getTimezoneLabelForEdit,
  getUtcDateAndTime,
  isConfigCetCest,
  localDateAndTimeToUtc,
  resolvedTimezoneFromFlag,
  useEuropeParisFromIanaAndDisplay
} from './date-format-timezone.util';

function fullConfig(overrides: Partial<DateFormatJsonValue> = {}): DateFormatJsonValue {
  return {
    locale: 'en-GB',
    timezone: { iana: 'Europe/Paris', displayName: 'CET', abbreviationMode: 'short' },
    date: {} as DateFormatJsonValue['date'],
    time: { hour12: true, twoDigitMinute: true },
    display: { order: 'dateFirst', separator: ' at ', suffix: { enabled: false, style: 'short', fallback: 'CET', wrap: 'NONE' } },
    ...overrides
  } as DateFormatJsonValue;
}

describe('date-format-timezone.util', () => {
  describe('getTimezoneAbbr', () => {
    it('returns abbreviation from formatToParts', () => {
      const result = getTimezoneAbbr(new Date('2026-02-26T12:00:00.000Z'));
      expect(['CET', 'CEST']).toContain(result);
    });

    it('returns CET when timeZoneName part is missing', () => {
      const spy = jest
        .spyOn(Intl.DateTimeFormat.prototype, 'formatToParts')
        .mockReturnValueOnce([{ type: 'day', value: '26' }] as Intl.DateTimeFormatPart[]);
      expect(getTimezoneAbbr(new Date())).toBe('CET');
      spy.mockRestore();
    });
  });

  describe('isConfigCetCest', () => {
    it('returns false when config?.timezone is null', () => {
      expect(isConfigCetCest(null)).toBe(false);
      expect(isConfigCetCest({} as DateFormatJsonValue)).toBe(false);
    });

    it('returns true when timezone.iana is Europe/Paris', () => {
      const config = fullConfig({ timezone: { iana: 'Europe/Paris', displayName: '', abbreviationMode: 'short' } });
      expect(isConfigCetCest(config)).toBe(true);
    });

    it('returns true when displayName is CET or CEST', () => {
      expect(isConfigCetCest(fullConfig({ timezone: { iana: '', displayName: 'CET', abbreviationMode: 'short' } }))).toBe(true);
      expect(isConfigCetCest(fullConfig({ timezone: { iana: '', displayName: 'CEST', abbreviationMode: 'short' } }))).toBe(true);
    });

    it('uses display.suffix.fallback when timezone.displayName is undefined', () => {
      const config = {
        ...fullConfig(),
        timezone: { iana: 'Other', displayName: undefined as unknown as string, abbreviationMode: 'short' },
        display: { order: 'dateFirst', separator: ' ', suffix: { enabled: false, style: 'short', fallback: 'CET', wrap: 'NONE' as const } }
      } as DateFormatJsonValue;
      expect(isConfigCetCest(config)).toBe(true);
    });

    it('returns false when iana and displayName not CET/CEST', () => {
      const config = fullConfig({ timezone: { iana: 'America/New_York', displayName: 'EST', abbreviationMode: 'short' } });
      expect(isConfigCetCest(config)).toBe(false);
    });

    it('uses empty displayName when display.suffix is undefined', () => {
      const config = {
        ...fullConfig(),
        timezone: { iana: 'Other', displayName: undefined as unknown as string, abbreviationMode: 'short' },
        display: undefined as unknown as DateFormatJsonValue['display']
      } as DateFormatJsonValue;
      expect(isConfigCetCest(config)).toBe(false);
    });
  });

  describe('getTimezoneLabelForEdit', () => {
    it('returns UTC when not CET/CEST', () => {
      expect(getTimezoneLabelForEdit(null)).toBe('UTC');
      expect(getTimezoneLabelForEdit(fullConfig({ timezone: { iana: 'America/New_York', displayName: 'EST', abbreviationMode: 'short' } }))).toBe(
        'UTC'
      );
    });

    it('returns getTimezoneAbbr when CET/CEST', () => {
      const config = fullConfig();
      const result = getTimezoneLabelForEdit(config, new Date('2026-02-26T12:00:00.000Z'));
      expect(['CET', 'CEST']).toContain(result);
    });

    it('uses when param or new Date()', () => {
      const config = fullConfig();
      expect(getTimezoneLabelForEdit(config)).toBeDefined();
    });
  });

  describe('getResolvedTimezone', () => {
    it('returns UTC when config?.timezone is null', () => {
      expect(getResolvedTimezone(null)).toBe('UTC');
    });

    it('returns Europe/Paris when config is CET/CEST', () => {
      const config = fullConfig();
      expect(getResolvedTimezone(config)).toBe('Europe/Paris');
    });

    it('returns UTC when config timezone is not CET/CEST', () => {
      const config = fullConfig({ timezone: { iana: 'America/New_York', displayName: 'EST', abbreviationMode: 'short' } });
      expect(getResolvedTimezone(config)).toBe('UTC');
    });

    it('returns UTC when timezone.iana is not a string', () => {
      const config = fullConfig({ timezone: { iana: 1 as unknown as string, displayName: 'X', abbreviationMode: 'short' } });
      expect(getResolvedTimezone(config)).toBe('UTC');
    });

    it('returns UTC when displayName and suffix.fallback are both empty', () => {
      const config = fullConfig({
        timezone: { iana: 'Other', displayName: '', abbreviationMode: 'short' },
        display: { order: 'dateFirst', separator: ' ', suffix: { enabled: false, style: 'short', fallback: '', wrap: 'NONE' as const } }
      });
      expect(getResolvedTimezone(config)).toBe('UTC');
    });

    it('returns Europe/Paris when timezone.displayName is undefined but display.suffix.fallback is CET', () => {
      const config = {
        ...fullConfig(),
        timezone: { iana: 'Other', displayName: undefined as unknown as string, abbreviationMode: 'short' },
        display: { order: 'dateFirst', separator: ' ', suffix: { enabled: false, style: 'short', fallback: 'CET', wrap: 'NONE' as const } }
      } as DateFormatJsonValue;
      expect(getResolvedTimezone(config)).toBe('Europe/Paris');
    });

    it('uses empty displayName when config.display is undefined (suffixCfg undefined)', () => {
      const config = {
        ...fullConfig(),
        timezone: { iana: 'Other', displayName: undefined as unknown as string, abbreviationMode: 'short' },
        display: undefined as unknown as DateFormatJsonValue['display']
      } as DateFormatJsonValue;
      expect(getResolvedTimezone(config)).toBe('UTC');
    });
  });

  describe('resolvedTimezoneFromFlag', () => {
    it('returns CET_TZ when true', () => {
      expect(resolvedTimezoneFromFlag(true)).toBe('Europe/Paris');
    });
    it('returns UTC when false', () => {
      expect(resolvedTimezoneFromFlag(false)).toBe('UTC');
    });
  });

  describe('useEuropeParisFromIanaAndDisplay', () => {
    it('returns true when iana is string and in SUPPORTED_TZ_IANA', () => {
      expect(useEuropeParisFromIanaAndDisplay('Europe/Paris', '')).toBe(true);
    });
    it('returns true when iana not in set but displayName in CET_CEST', () => {
      expect(useEuropeParisFromIanaAndDisplay('Other', 'CET')).toBe(true);
    });
    it('returns false when iana not in set and displayName not in CET_CEST', () => {
      expect(useEuropeParisFromIanaAndDisplay('America/New_York', 'EST')).toBe(false);
    });
    it('returns false when iana is not a string and displayName not in set', () => {
      expect(useEuropeParisFromIanaAndDisplay(1, '')).toBe(false);
    });
    it('returns true when iana is not a string but displayName in set', () => {
      expect(useEuropeParisFromIanaAndDisplay(1, 'CEST')).toBe(true);
    });
  });

  describe('formatUtcToUtcDisplay', () => {
    it('returns date and time in UTC with (UTC) suffix', () => {
      const result = formatUtcToUtcDisplay(new Date('2026-02-26T12:00:00.000Z'));
      expect(result).toContain(' at ');
      expect(result).toContain('(UTC)');
    });
  });

  describe('getLocalDateAndTime', () => {
    it('returns date and time for valid UTC date', () => {
      const result = getLocalDateAndTime(new Date('2026-02-26T12:00:00.000Z'));
      expect(result).not.toBeNull();
      expect(result!.date).toBeInstanceOf(Date);
      expect(result!.time).toBeInstanceOf(Date);
    });

    it('returns null for NaN date', () => {
      expect(getLocalDateAndTime(new Date('invalid'))).toBeNull();
    });

    it('uses "0" fallback when a part is missing from formatToParts', () => {
      const spy = jest.spyOn(Intl.DateTimeFormat.prototype, 'formatToParts').mockReturnValueOnce([
        { type: 'year', value: '2026' },
        { type: 'month', value: '02' },
        { type: 'day', value: '26' },
        { type: 'hour', value: '12' }
        // omit 'minute' so get('minute') triggers ?.value ?? '0'
      ] as Intl.DateTimeFormatPart[]);
      const result = getLocalDateAndTime(new Date('2026-02-26T12:00:00.000Z'));
      spy.mockRestore();
      expect(result).not.toBeNull();
      expect(result!.time.getMinutes()).toBe(0);
    });
  });

  describe('getUtcDateAndTime', () => {
    it('returns UTC date and time for valid date', () => {
      const utcDate = new Date('2026-02-26T12:00:00.000Z');
      const result = getUtcDateAndTime(utcDate);
      expect(result).not.toBeNull();
      expect(result!.date.getUTCFullYear()).toBe(2026);
      expect(result!.time.getHours()).toBe(12);
      expect(result!.time.getMinutes()).toBe(0);
    });

    it('returns null for NaN date', () => {
      expect(getUtcDateAndTime(new Date('invalid'))).toBeNull();
    });
  });

  describe('cetCestLocalToUtc', () => {
    it('converts local to UTC (positive offset branch)', () => {
      const date = new Date(2026, 6, 15); // July = summer
      const time = new Date(0, 0, 0, 14, 30, 0);
      const utc = cetCestLocalToUtc(date, time);
      expect(utc).toBeInstanceOf(Date);
      expect(Number.isNaN(utc.getTime())).toBe(false);
    });

    it('converts local to UTC (winter time)', () => {
      const date = new Date(2026, 0, 15); // January = winter
      const time = new Date(0, 0, 0, 14, 30, 0);
      const utc = cetCestLocalToUtc(date, time);
      expect(utc).toBeInstanceOf(Date);
      expect(Number.isNaN(utc.getTime())).toBe(false);
    });

    it('covers negative offset branch (offsetSign "-")', () => {
      const Original = global.Intl.DateTimeFormat;
      try {
        (global.Intl as unknown as { DateTimeFormat: unknown }).DateTimeFormat = class {
          format() {
            return '11';
          }
        } as unknown as typeof Intl.DateTimeFormat;
        const date = new Date(2026, 0, 15);
        const time = new Date(0, 0, 0, 12, 0, 0);
        const utc = cetCestLocalToUtc(date, time);
        expect(utc).toBeInstanceOf(Date);
      } finally {
        (global.Intl as unknown as { DateTimeFormat: unknown }).DateTimeFormat = Original;
      }
    });
  });

  describe('localDateAndTimeToUtc', () => {
    it('calls cetCestLocalToUtc when config is CET/CEST', () => {
      const config = fullConfig();
      const date = new Date(2026, 0, 15);
      const time = new Date(0, 0, 0, 12, 0, 0);
      const result = localDateAndTimeToUtc(date, time, config);
      expect(result).toBeInstanceOf(Date);
    });

    it('builds UTC date when config is not CET/CEST', () => {
      const config = fullConfig({ timezone: { iana: 'America/New_York', displayName: 'EST', abbreviationMode: 'short' } });
      const date = new Date(2026, 0, 15);
      const time = new Date(0, 0, 0, 12, 0, 0);
      const result = localDateAndTimeToUtc(date, time, config);
      expect(result).toBeInstanceOf(Date);
      expect(result.getUTCHours()).toBe(12);
    });

    it('builds UTC date when config is null', () => {
      const date = new Date(2026, 0, 15);
      const time = new Date(0, 0, 0, 12, 0, 0);
      const result = localDateAndTimeToUtc(date, time, null);
      expect(result.getUTCHours()).toBe(12);
    });
  });
});
