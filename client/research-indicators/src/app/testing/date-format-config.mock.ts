import { Provider, signal } from '@angular/core';
import { DateFormatConfigService } from '@shared/services/date-format-config.service';
import { DateFormatJsonValue } from '@shared/interfaces/date-format-config.interface';

/** The platform `date-format` app_config value (DMY, "/", Europe/Paris), as the server returns it. */
export const DATE_FORMAT_CONFIG_FIXTURE: DateFormatJsonValue = {
  locale: 'en-US',
  timezone: { iana: 'Europe/Paris', displayName: 'CET', abbreviationMode: 'AUTO' },
  date: {
    style: 'numeric',
    order: 'DMY',
    separator: '/',
    twoDigitDay: true,
    twoDigitMonth: true,
    fourDigitYear: true,
    monthName: { enabled: false, format: 'long', uppercase: true }
  },
  time: { hour12: true, twoDigitMinute: true },
  display: { order: 'DATE_TIME', separator: ' at ', suffix: { enabled: true, style: 'AUTO_TZ_ABBR', fallback: 'CET', wrap: 'PAREN' } }
};

/** DateFormatConfigService already loaded with the platform configuration (no HTTP). */
export function provideDateFormatConfigMock(config: DateFormatJsonValue | null = DATE_FORMAT_CONFIG_FIXTURE): Provider {
  return { provide: DateFormatConfigService, useValue: { config: signal(config), loadConfig: () => Promise.resolve(config) } };
}
