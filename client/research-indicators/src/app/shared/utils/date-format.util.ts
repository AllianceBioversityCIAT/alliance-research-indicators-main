import type { DateFormatJsonValue } from '@shared/interfaces/date-format-config.interface';
import type { CetFormatted, DateInput } from '@shared/interfaces/date-format.interface';
import { CET_TZ, HAS_UTC_OR_OFFSET } from '@shared/constants/date-format.constants';
import { buildDateString, getCalendarDateFormat } from './date-format-date.util';
import { buildDisplaySuffix, buildTimeString, getCalendarTimeFormat } from './date-format-time.util';
import { formatUtcToUtcDisplay, getResolvedTimezone, getTimezoneAbbr } from './date-format-timezone.util';
export {
  getLocalDateAndTime,
  getUtcDateAndTime,
  getTimezoneLabelForEdit,
  isConfigCetCest,
  localDateAndTimeToUtc,
  cetCestLocalToUtc
} from './date-format-timezone.util';

export function tzLabelFromResolved(tz: string, d: Date): string {
  if (tz === 'UTC') return 'UTC';
  return getTimezoneAbbr(d);
}

function toUtcString(raw: DateInput): string | null {
  if (raw == null) return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw.toISOString();
  return raw;
}

function toDate(raw: DateInput): Date | null {
  const str = toUtcString(raw);
  if (str == null) return null;
  const normalized = HAS_UTC_OR_OFFSET.test(str) ? str : `${str}Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatUtcToCet(raw: DateInput): CetFormatted | null {
  const d = toDate(raw);
  if (d == null) return null;
  const dateStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: CET_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d);
  const timeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: CET_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d);
  return { date: dateStr, time: timeStr };
}

export function formatUtcToCetDisplay(raw: DateInput): string | null {
  const formatted = formatUtcToCet(raw);
  if (!formatted) return null;
  return `${formatted.date} at ${formatted.time} (CET)`;
}

export function formatUtcWithConfig(raw: DateInput, config: DateFormatJsonValue | null): string | null {
  const d = toDate(raw);
  if (d == null) return null;
  if (config?.timezone == null) return formatUtcToUtcDisplay(d);

  const tz = getResolvedTimezone(config);
  const locale = config.locale ?? 'en-GB';
  const sep = config.display?.separator ?? ' at ';
  const tzLabel = tzLabelFromResolved(tz, d);
  const dateStr = buildDateString(d, config, locale, tz);
  const timeStr = buildTimeString(d, config, locale, tz);
  const suffix = buildDisplaySuffix(config, tzLabel);

  return `${dateStr}${sep}${timeStr}${suffix}`;
}

export function formatUtcWithConfigParts(raw: DateInput, config: DateFormatJsonValue | null): (CetFormatted & { timezoneLabel: string }) | null {
  const d = toDate(raw);
  if (d == null) return null;
  if (config?.timezone == null) {
    const dateStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d);
    const timeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'UTC',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(d);
    return { date: dateStr, time: timeStr, timezoneLabel: 'UTC' };
  }

  const tz = getResolvedTimezone(config);
  const locale = config.locale ?? 'en-GB';
  const tzLabel = tzLabelFromResolved(tz, d);
  const dateStr = buildDateString(d, config, locale, tz);
  const timeStr = buildTimeString(d, config, locale, tz);

  return { date: dateStr, time: timeStr, timezoneLabel: tzLabel };
}

export function getCalendarFormatsFromConfig(config: DateFormatJsonValue | null): {
  dateFormat: string;
  hourFormat: '12' | '24';
  timeFormat: string;
} {
  return {
    dateFormat: getCalendarDateFormat(config),
    ...getCalendarTimeFormat(config)
  };
}
