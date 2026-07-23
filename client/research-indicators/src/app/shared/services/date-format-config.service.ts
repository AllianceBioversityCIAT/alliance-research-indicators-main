import { inject, Injectable, signal } from '@angular/core';
import { APPLICATION_CONFIGURATION_KEY } from '@shared/constants/application-configuration-keys';
import { CacheService } from '@services/cache/cache.service';
import { ApiService } from './api.service';
import { DateFormatJsonValue } from '@shared/interfaces/date-format-config.interface';

function normalizeDateFormatConfig(raw: unknown): DateFormatJsonValue | null {
  if (raw == null || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const inner = obj['json_value'];
  if (inner != null && typeof inner === 'object' && 'timezone' in inner) {
    return inner as DateFormatJsonValue;
  }
  if ('timezone' in obj) return raw as DateFormatJsonValue;
  return null;
}

@Injectable({
  providedIn: 'root'
})
export class DateFormatConfigService {
  private readonly api = inject(ApiService);
  private readonly cache = inject(CacheService);

  private loadPromise: Promise<DateFormatJsonValue | null> | null = null;

  readonly config = signal<DateFormatJsonValue | null>(null);

  loadConfig(): Promise<DateFormatJsonValue | null> {
    if (!this.cache.dataCache().access_token) {
      this.config.set(null);
      return Promise.resolve(null);
    }
    if (this.loadPromise != null) {
      return this.loadPromise;
    }
    this.loadPromise = this.api
      .GET_ConfigurationByKey(APPLICATION_CONFIGURATION_KEY.DATE_FORMAT)
      .then(res => {
        const raw = res?.data?.json_value;
        const value = normalizeDateFormatConfig(raw);
        this.config.set(value);
        return value;
      })
      .catch(() => {
        this.config.set(null);
        return null;
      });
    return this.loadPromise;
  }
}
