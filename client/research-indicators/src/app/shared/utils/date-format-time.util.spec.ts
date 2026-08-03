import type { DateFormatJsonValue } from '@shared/interfaces/date-format-config.interface';
import { buildDisplaySuffix, buildTimeString, getCalendarTimeFormat } from './date-format-time.util';

function fullConfig(overrides: Partial<DateFormatJsonValue> = {}): DateFormatJsonValue {
  return {
    locale: 'en-GB',
    timezone: { iana: 'Europe/Paris', displayName: 'CET', abbreviationMode: 'short' },
    date: {} as DateFormatJsonValue['date'],
    time: { hour12: true, twoDigitMinute: true },
    display: { order: 'dateFirst', separator: ' at ', suffix: { enabled: false, style: 'short', fallback: '', wrap: 'NONE' } },
    ...overrides
  } as DateFormatJsonValue;
}

describe('date-format-time.util', () => {
  const d = new Date('2026-02-26T14:30:00.000Z');

  describe('buildTimeString', () => {
    it('formats time with default options', () => {
      const config = fullConfig();
      expect(buildTimeString(d, config, 'en-GB', 'UTC')).toBeDefined();
    });

    it('uses hour12 true when config.time is undefined', () => {
      const config = fullConfig();
      delete (config as Record<string, unknown>).time;
      expect(buildTimeString(d, config as DateFormatJsonValue, 'en-GB', 'UTC')).toBeDefined();
    });

    it('uses twoDigitMinute false when time.twoDigitMinute === false', () => {
      const config = fullConfig({ time: { hour12: true, twoDigitMinute: false } });
      expect(buildTimeString(d, config, 'en-GB', 'UTC')).toBeDefined();
    });

    it('uses hour12 from config.time.hour12', () => {
      const config = fullConfig({ time: { hour12: false, twoDigitMinute: true } });
      expect(buildTimeString(d, config, 'en-GB', 'UTC')).toBeDefined();
    });
  });

  describe('buildDisplaySuffix', () => {
    it('returns empty when tzLabel is empty', () => {
      expect(buildDisplaySuffix(fullConfig(), '')).toBe('');
    });

    it('returns empty when suffix.enabled !== true', () => {
      expect(buildDisplaySuffix(fullConfig(), 'UTC')).toBe('');
    });

    it('returns empty when config is null', () => {
      expect(buildDisplaySuffix(null, 'CET')).toBe('');
    });

    it('returns label with parens when suffix.wrap === PAREN', () => {
      const config = fullConfig({
        display: { order: 'dateFirst', separator: ' at ', suffix: { enabled: true, style: 'short', fallback: '', wrap: 'PAREN' } }
      });
      expect(buildDisplaySuffix(config, 'CET')).toBe(' (CET)');
    });

    it('returns label without parens when suffix.wrap !== PAREN', () => {
      const config = fullConfig({
        display: { order: 'dateFirst', separator: ' at ', suffix: { enabled: true, style: 'short', fallback: '', wrap: 'NONE' } }
      });
      expect(buildDisplaySuffix(config, 'UTC')).toBe(' UTC');
    });
  });

  describe('getCalendarTimeFormat', () => {
    it('returns default 12h when config is null', () => {
      expect(getCalendarTimeFormat(null)).toEqual({ hourFormat: '12', timeFormat: 'h:mm a' });
    });

    it('returns 12h when config.time?.hour12 !== false', () => {
      const config = fullConfig();
      expect(getCalendarTimeFormat(config)).toEqual({ hourFormat: '12', timeFormat: 'h:mm a' });
    });

    it('returns 24h when config.time.hour12 === false', () => {
      const config = fullConfig({ time: { hour12: false, twoDigitMinute: true } });
      expect(getCalendarTimeFormat(config)).toEqual({ hourFormat: '24', timeFormat: 'HH:mm' });
    });
  });
});
