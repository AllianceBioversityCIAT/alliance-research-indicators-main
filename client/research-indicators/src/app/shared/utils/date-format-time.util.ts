import type { DateFormatJsonValue } from '@shared/interfaces/date-format-config.interface';

export function buildTimeString(d: Date, config: DateFormatJsonValue, locale: string, timeZone: string): string {
  const timeCfg = config.time;
  const minuteOpt = timeCfg?.twoDigitMinute === false ? 'numeric' : '2-digit';
  const hour12 = timeCfg?.hour12 ?? true;
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: 'numeric',
    minute: minuteOpt,
    hour12
  }).format(d);
}

export function buildDisplaySuffix(config: DateFormatJsonValue | null, tzLabel: string): string {
  if (!tzLabel) return '';
  const suffixCfg = config?.display?.suffix;
  if (suffixCfg?.enabled !== true) return '';
  const wrap = suffixCfg.wrap === 'PAREN' ? `(${tzLabel})` : tzLabel;
  return ` ${wrap}`;
}

export function getCalendarTimeFormat(config: DateFormatJsonValue | null): {
  hourFormat: '12' | '24';
  timeFormat: string;
} {
  if (config == null) return { hourFormat: '12', timeFormat: 'h:mm a' };
  const hour12 = config.time?.hour12 !== false;
  return {
    hourFormat: hour12 ? '12' : '24',
    timeFormat: hour12 ? 'h:mm a' : 'HH:mm'
  };
}
