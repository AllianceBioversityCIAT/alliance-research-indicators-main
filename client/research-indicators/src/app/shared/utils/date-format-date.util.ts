import type { DateFormatJsonValue } from '@shared/interfaces/date-format-config.interface';

export function buildDateString(d: Date, config: DateFormatJsonValue, locale: string, timeZone: string): string {
  const dateCfg = config.date;
  const monthName = dateCfg?.monthName;
  const useMonthName = monthName?.enabled === true;
  const monthFormat = monthName?.format === 'long' ? 'long' : 'short';
  const monthOpt = useMonthName ? monthFormat : '2-digit';
  const dayOpt = dateCfg?.twoDigitDay === false ? 'numeric' : '2-digit';
  const yearOpt = dateCfg?.fourDigitYear === false ? '2-digit' : 'numeric';
  const dateOpts: Intl.DateTimeFormatOptions = {
    timeZone,
    day: dayOpt,
    month: monthOpt,
    year: yearOpt
  };
  const dateParts = new Intl.DateTimeFormat(locale, dateOpts).formatToParts(d);
  const getPart = (type: string) => dateParts.find(p => p.type === type)?.value ?? '';
  const day = getPart('day');
  const month = getPart('month');
  const year = getPart('year');
  const dateOrder = dateCfg?.order ?? 'DMY';
  const dateSep = dateCfg?.separator ?? '/';
  let ordered: string[];
  if (dateOrder === 'DMY') ordered = [day, month, year];
  else if (dateOrder === 'MDY') ordered = [month, day, year];
  else ordered = [year, month, day];
  return ordered.join(dateSep);
}

export function getCalendarDateFormat(config: DateFormatJsonValue | null): string {
  if (config?.date == null) return 'dd/mm/yy';
  const date = config.date;
  const sep = date.separator ?? '/';
  const dayPart = date.twoDigitDay === false ? 'd' : 'dd';
  let monthPart: string;
  if (date.monthName?.enabled === true) {
    monthPart = date.monthName.format === 'long' ? 'MM' : 'M';
  } else {
    monthPart = date.twoDigitMonth === false ? 'm' : 'mm';
  }
  const yearPart = date.fourDigitYear === false ? 'y' : 'yy';
  const order = date.order ?? 'DMY';
  if (order === 'DMY') return `${dayPart}${sep}${monthPart}${sep}${yearPart}`;
  if (order === 'MDY') return `${monthPart}${sep}${dayPart}${sep}${yearPart}`;
  return `${yearPart}${sep}${monthPart}${sep}${dayPart}`;
}
