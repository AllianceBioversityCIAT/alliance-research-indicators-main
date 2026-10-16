import { inject, Injectable, signal } from '@angular/core';
import { APPLICATION_CONFIGURATION_KEY } from '@shared/constants/application-configuration-keys';
import { CacheService } from '@services/cache/cache.service';
import { isFeatureFlagEnabled } from '@shared/utils/feature-flag.util';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class PoolFundingFlagsService {
  private readonly api = inject(ApiService);
  private readonly cache = inject(CacheService);

  private loadPromise: Promise<void> | null = null;

  /** Fail-open until a read resolves. `true` lets the existing rules decide. */
  readonly sectionEnabled = signal(true);
  /** Fail-open until a read resolves. `true` lets the section's filtered list decide. */
  readonly prmsSyncButtonEnabled = signal(true);

  load(): Promise<void> {
    if (!this.cache.dataCache().access_token) {
      this.sectionEnabled.set(true);
      this.prmsSyncButtonEnabled.set(true);
      return Promise.resolve();
    }
    if (this.loadPromise != null) {
      return this.loadPromise;
    }
    this.loadPromise = Promise.all([
      this.readFlag(APPLICATION_CONFIGURATION_KEY.POOL_FUNDING_SECTION_ENABLED),
      this.readFlag(APPLICATION_CONFIGURATION_KEY.POOL_FUNDING_PRMS_SYNC_BUTTON_ENABLED)
    ]).then(([sectionEnabled, buttonEnabled]) => {
      this.sectionEnabled.set(sectionEnabled);
      this.prmsSyncButtonEnabled.set(buttonEnabled);
    });
    return this.loadPromise;
  }

  private readFlag(key: string): Promise<boolean> {
    return this.api
      .GET_ConfigurationByKey(key)
      .then(res => isFeatureFlagEnabled(res?.data?.simple_value))
      .catch(() => true);
  }
}
