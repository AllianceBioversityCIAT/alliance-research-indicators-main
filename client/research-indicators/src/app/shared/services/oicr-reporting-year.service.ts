import { inject, Injectable, signal } from '@angular/core';
import { APPLICATION_CONFIGURATION_KEY } from '@shared/constants/application-configuration-keys';
import { ApiService } from './api.service';

/** Used until the configuration resolves, and whenever it is missing or not a year. */
export const DEFAULT_OICR_REPORTING_YEAR = 2026;

/**
 * The only reporting year an OICR can be created for, editable from
 * Administration → Configuration → Variables (`OICR.REPORTING_YEAR`).
 * Read once per session: a saved change applies after a page reload.
 */
@Injectable({
  providedIn: 'root'
})
export class OicrReportingYearService {
  private readonly api = inject(ApiService);

  private loadPromise: Promise<number> | null = null;

  readonly year = signal<number>(DEFAULT_OICR_REPORTING_YEAR);

  load(): Promise<number> {
    this.loadPromise ??= this.api
      .GET_ConfigurationByKey(APPLICATION_CONFIGURATION_KEY.OICR_REPORTING_YEAR)
      .then(res => parseYear(res?.data?.simple_value))
      .catch(() => DEFAULT_OICR_REPORTING_YEAR)
      .then(year => {
        this.year.set(year);
        return year;
      });
    return this.loadPromise;
  }
}

function parseYear(value: string | null | undefined): number {
  const year = Number(value?.trim());
  return Number.isInteger(year) && year > 1900 ? year : DEFAULT_OICR_REPORTING_YEAR;
}
