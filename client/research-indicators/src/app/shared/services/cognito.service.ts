import { inject, Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CacheService } from '@services/cache/cache.service';
import { ApiService } from '@services/api.service';
import { ActionsService } from '@services/actions.service';
import { ClarityService } from './clarity.service';
import { DateFormatConfigService } from './date-format-config.service';
import { ValidateCacheService } from './validate-cache.service';
import { environment } from '../../../environments/environment';
import { DataCache } from '@interfaces/cache.interface';

@Injectable({
  providedIn: 'root'
})
export class CognitoService {
  activatedRoute = inject(ActivatedRoute);
  router = inject(Router);
  cache = inject(CacheService);
  api = inject(ApiService);
  actions = inject(ActionsService);
  clarity = inject(ClarityService);
  private readonly dateFormatConfig = inject(DateFormatConfigService);
  private readonly validateCache = inject(ValidateCacheService);

  private readonly loginReturnUrlKey = 'loginReturnUrl';

  redirectToCognito(returnUrl?: string) {
    if (returnUrl?.startsWith('/')) {
      sessionStorage.setItem(this.loginReturnUrlKey, returnUrl);
    }
    window.location.href =
      `${environment.cognitoDomain}oauth2/authorize` +
      `?response_type=code` +
      `&client_id=${environment.cognitoClientId}` +
      `&redirect_uri=${environment.cognitoRedirectUri}` +
      `&scope=openid+email+profile` +
      `&identity_provider=${environment.cognitoIdentityProvider}`;
  }

  async validateCognitoCode() {
    const { code } = this.activatedRoute.snapshot.queryParams ?? {};
    if (!code) return;
    this.cache.isValidatingToken.set(true);
    const loginResponse = await this.api.login(code);
    if (!loginResponse.successfulRequest) {
      this.actions.showGlobalAlert({
        severity: 'error',
        summary: 'Error authenticating',
        detail: loginResponse.errorDetail.errors,
        cancelCallback: {
          label: 'Cancel',
          event: () => void this.router.navigate(['/login'])
        },
        confirmCallback: {
          label: 'Retry Log in',
          event: () => this.redirectToCognito()
        }
      });
      return;
    }

    this.actions.updateLocalStorage(loginResponse);

    this.updateCacheService();
    const returnUrl = sessionStorage.getItem(this.loginReturnUrlKey);
    if (returnUrl) {
      sessionStorage.removeItem(this.loginReturnUrlKey);
    }
    setTimeout(() => {
      if (returnUrl?.startsWith('/')) {
        this.router.navigateByUrl(returnUrl);
      } else {
        this.router.navigate(['/']);
      }
    }, 2000);
  }

  updateCacheService() {
    const raw = localStorage.getItem('data') ?? '{}';
    let parsed: DataCache;
    try {
      const obj = JSON.parse(raw) as Partial<DataCache>;
      parsed = Object.assign(new DataCache(), obj);
    } catch {
      parsed = new DataCache();
    }
    this.cache.dataCache.set(parsed);
    this.cache.isLoggedIn.set(true);
    this.cache.isValidatingToken.set(false);
    this.clarity.updateUserInfo();

    if (parsed.access_token) {
      void this.dateFormatConfig.loadConfig();
      void this.validateCache.validateVersions();
    }
  }
}
