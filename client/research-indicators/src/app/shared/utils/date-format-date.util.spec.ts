import type { DateFormatJsonValue } from '@shared/interfaces/date-format-config.interface';
import { buildDateString, getCalendarDateFormat } from './date-format-date.util';

function fullConfig(overrides: Partial<DateFormatJsonValue> = {}): DateFormatJsonValue {
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
    display: { order: 'dateFirst', separator: ' at ', suffix: { enabled: false, style: 'short', fallback: '', wrap: 'NONE' } },
    ...overrides
  } as DateFormatJsonValue;
}

describe('date-format-date.util', () => {
  const d = new Date('2026-02-26T12:00:00.000Z');

  describe('buildDateString', () => {
    it('uses default order DMY and separator', () => {
      const config = fullConfig();
      expect(buildDateString(d, config, 'en-GB', 'UTC')).toMatch(/\d{1,2}\/\d{1,2}\/2026/);
    });

    it('uses twoDigitDay false when date.twoDigitDay === false', () => {
      const config = fullConfig({ date: { ...fullConfig().date!, twoDigitDay: false } });
      const out = buildDateString(d, config, 'en-GB', 'UTC');
      expect(out).toBeDefined();
    });

    it('uses fourDigitYear false when date.fourDigitYear === false', () => {
      const config = fullConfig({ date: { ...fullConfig().date!, fourDigitYear: false } });
      const out = buildDateString(d, config, 'en-GB', 'UTC');
      expect(out).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}/);
    });

    it('uses month name long when monthName.enabled and format long', () => {
      const config = fullConfig({
        date: { ...fullConfig().date!, monthName: { enabled: true, format: 'long', uppercase: false } }
      });
      const out = buildDateString(d, config, 'en-GB', 'UTC');
      expect(out).toBeDefined();
    });

    it('uses month name short when monthName.enabled and format short', () => {
      const config = fullConfig({
        date: { ...fullConfig().date!, monthName: { enabled: true, format: 'short', uppercase: false } }
      });
      const out = buildDateString(d, config, 'en-GB', 'UTC');
      expect(out).toBeDefined();
    });

    it('uses order MDY', () => {
      const config = fullConfig({ date: { ...fullConfig().date!, order: 'MDY' } });
      const out = buildDateString(d, config, 'en-GB', 'UTC');
      expect(out).toBeDefined();
    });

    it('uses order YMD', () => {
      const config = fullConfig({ date: { ...fullConfig().date!, order: 'YMD' } });
      const out = buildDateString(d, config, 'en-GB', 'UTC');
      expect(out).toBeDefined();
    });

    it('uses custom separator from config.date.separator', () => {
      const config = fullConfig({ date: { ...fullConfig().date!, separator: '-' } });
      const out = buildDateString(d, config, 'en-GB', 'UTC');
      expect(out).toContain('-');
    });

    it('uses dateCfg?.order and dateCfg?.separator defaults when undefined', () => {
      const base = fullConfig().date!;
      const config = fullConfig({ date: { ...base, order: undefined as unknown as 'DMY', separator: undefined as unknown as string } });
      const out = buildDateString(d, config, 'en-GB', 'UTC');
      expect(out).toMatch(/\d/);
    });

    it('uses getPart fallback when part missing', () => {
      const config = fullConfig();
      const spy = jest
        .spyOn(Intl.DateTimeFormat.prototype, 'formatToParts')
        .mockReturnValueOnce([{ type: 'literal', value: 'x' }] as Intl.DateTimeFormatPart[]);
      const out = buildDateString(d, config, 'en-GB', 'UTC');
      expect(out).toBeDefined();
      expect(out).not.toContain('undefined');
      spy.mockRestore();
    });
  });

  describe('getCalendarDateFormat', () => {
    it('returns dd/mm/yy when config?.date is null', () => {
      expect(getCalendarDateFormat(null)).toBe('dd/mm/yy');
      expect(getCalendarDateFormat({} as DateFormatJsonValue)).toBe('dd/mm/yy');
    });

    it('returns format with d when twoDigitDay false', () => {
      const config = fullConfig({ date: { ...fullConfig().date!, twoDigitDay: false } });
      expect(getCalendarDateFormat(config)).toContain('d');
    });

    it('returns format with MM when monthName enabled long', () => {
      const config = fullConfig({
        date: { ...fullConfig().date!, monthName: { enabled: true, format: 'long', uppercase: false } }
      });
      expect(getCalendarDateFormat(config)).toContain('MM');
    });

    it('returns format with M when monthName enabled short', () => {
      const config = fullConfig({
        date: { ...fullConfig().date!, monthName: { enabled: true, format: 'short', uppercase: false } }
      });
      expect(getCalendarDateFormat(config)).toContain('M');
    });

    it('returns format with m when twoDigitMonth false and no month name', () => {
      const config = fullConfig({ date: { ...fullConfig().date!, twoDigitMonth: false } });
      expect(getCalendarDateFormat(config)).toContain('m');
    });

    it('returns format with y when fourDigitYear false', () => {
      const config = fullConfig({ date: { ...fullConfig().date!, fourDigitYear: false } });
      expect(getCalendarDateFormat(config)).toContain('y');
    });

    it('returns DMY format when order DMY', () => {
      const config = fullConfig({ date: { ...fullConfig().date!, order: 'DMY', separator: '.' } });
      expect(getCalendarDateFormat(config)).toMatch(/dd\.mm\.yy/);
    });

    it('returns MDY format when order MDY', () => {
      const config = fullConfig({ date: { ...fullConfig().date!, order: 'MDY', separator: '.' } });
      expect(getCalendarDateFormat(config)).toMatch(/mm\.dd\.yy/);
    });

    it('returns YMD format when order YMD', () => {
      const config = fullConfig({ date: { ...fullConfig().date!, order: 'YMD', separator: '.' } });
      expect(getCalendarDateFormat(config)).toMatch(/yy\.mm\.dd/);
    });

    it('uses default order and separator when date.order/separator undefined', () => {
      const base = fullConfig().date!;
      const config = fullConfig({ date: { ...base, order: undefined as unknown as 'DMY', separator: undefined as unknown as string } });
      const out = getCalendarDateFormat(config);
      expect(out).toContain('/');
      expect(out).toMatch(/dd|mm|yy/);
    });
  });
});
