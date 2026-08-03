import type { DateFormatJsonValue } from '@shared/interfaces/date-format-config.interface';
import type { DateAndTime } from '@shared/interfaces/date-format.interface';
import { CET_CEST_DISPLAY_NAMES, CET_TZ, SUPPORTED_TZ_IANA } from '@shared/constants/date-format.constants';

export function getTimezoneAbbr(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CET_TZ,
    timeZoneName: 'short'
  }).formatToParts(date);
  const tzPart = parts.find(p => p.type === 'timeZoneName');
  return (tzPart?.value ?? 'CET').toUpperCase();
}

export function isConfigCetCest(config: DateFormatJsonValue | null): boolean {
  if (config?.timezone == null) return false;
  const iana = config.timezone.iana;
  const suffixCfg = config.display?.suffix;
  const displayName = (config.timezone.displayName ?? suffixCfg?.fallback ?? '').toUpperCase();
  return (typeof iana === 'string' && SUPPORTED_TZ_IANA.has(iana)) || CET_CEST_DISPLAY_NAMES.has(displayName);
}

export function getTimezoneLabelForEdit(config: DateFormatJsonValue | null, when?: Date): string {
  if (!isConfigCetCest(config)) return 'UTC';
  return getTimezoneAbbr(when ?? new Date());
}

export function getResolvedTimezone(config: DateFormatJsonValue | null): string {
  if (config?.timezone == null) return 'UTC';
  const iana = config.timezone.iana;
  const suffixCfg = config.display?.suffix;
  const displayName = (config.timezone.displayName ?? suffixCfg?.fallback ?? '').toUpperCase();
  return resolvedTimezoneFromFlag(useEuropeParisFromIanaAndDisplay(iana, displayName));
}

export function useEuropeParisFromIanaAndDisplay(iana: unknown, displayName: string): boolean {
  const ianaMatch = typeof iana === 'string' && SUPPORTED_TZ_IANA.has(iana);
  if (ianaMatch) return true;
  return CET_CEST_DISPLAY_NAMES.has(displayName);
}

export function resolvedTimezoneFromFlag(useEuropeParis: boolean): string {
  if (useEuropeParis) return CET_TZ;
  return 'UTC';
}

export function formatUtcToUtcDisplay(d: Date): string {
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
  return `${dateStr} at ${timeStr} (UTC)`;
}

export function getLocalDateAndTime(utcDate: Date): DateAndTime | null {
  if (Number.isNaN(utcDate.getTime())) return null;
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: CET_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(utcDate);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0';
  const y = Number.parseInt(get('year'), 10);
  const m = Number.parseInt(get('month'), 10) - 1;
  const day = Number.parseInt(get('day'), 10);
  const h = Number.parseInt(get('hour'), 10);
  const min = Number.parseInt(get('minute'), 10);
  return {
    date: new Date(y, m, day),
    time: new Date(0, 0, 0, h, min, 0)
  };
}

export function getUtcDateAndTime(utcDate: Date): DateAndTime | null {
  if (Number.isNaN(utcDate.getTime())) return null;
  const y = utcDate.getUTCFullYear();
  const m = utcDate.getUTCMonth();
  const day = utcDate.getUTCDate();
  const h = utcDate.getUTCHours();
  const min = utcDate.getUTCMinutes();
  return {
    date: new Date(y, m, day),
    time: new Date(0, 0, 0, h, min, 0)
  };
}

/** Converts local date/time to UTC when timezone is CET/CEST (Europe/Paris). */
export function cetCestLocalToUtc(date: Date, time: Date): Date {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const h = time.getHours();
  const min = time.getMinutes();
  const noonUtc = Date.UTC(y, m, d, 12, 0, 0);
  const hourAtNoon = new Intl.DateTimeFormat('en-GB', {
    timeZone: CET_TZ,
    hour: 'numeric',
    hour12: false
  }).format(new Date(noonUtc));
  const offsetHours = Number.parseInt(hourAtNoon, 10) - 12;
  const offsetSign = offsetHours >= 0 ? '+' : '-';
  const offsetStr = `${offsetSign}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`;
  const isoParis = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00${offsetStr}`;
  return new Date(isoParis);
}

export function localDateAndTimeToUtc(date: Date, time: Date, config: DateFormatJsonValue | null): Date {
  if (isConfigCetCest(config)) return cetCestLocalToUtc(date, time);
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes(), 0, 0));
}
