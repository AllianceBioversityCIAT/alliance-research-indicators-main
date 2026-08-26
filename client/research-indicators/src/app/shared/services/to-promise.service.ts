import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom, map, catchError, finalize } from 'rxjs';
import { MainResponse } from '../interfaces/responses.interface';
import { environment } from '../../../environments/environment';
import { CacheService } from './cache/cache.service';
import { GreenChecks } from '../interfaces/get-green-checks.interface';
@Injectable({
  providedIn: 'root'
})
export class ToPromiseService {
  http = inject(HttpClient);
  cacheService = inject(CacheService);

  private readonly TP = (subscription: Observable<any>, loadingTrigger?: boolean): Promise<MainResponse<any>> => {
    if (loadingTrigger) {
      this.cacheService.currentResultIsLoading.set(true);
      this.cacheService.greenChecks.set({});
    }

    return firstValueFrom(
      subscription.pipe(
        map(data => ({ ...data, successfulRequest: true })),
        catchError(error => {
          console.error(error);
          return [{ ...error, successfulRequest: false, errorDetail: error?.error }];
        }),
        finalize(() => {
          if (loadingTrigger) {
            this.cacheService.currentResultIsLoading.set(false);
            this.updateGreenChecks();
          }
        })
      )
    );
  };

  delete = <T>(url: string, config?: Config) => {
    let headers = new HttpHeaders();

    if (config?.useResultInterceptor) {
      headers = headers.set('X-Use-Year', 'true');
    }

    headers = this.applyAuthMarker(headers, config);

    return this.TP(this.http.delete<T>(this.getEnv(config?.isAuth) + url, { headers }));
  };

  post = <T, B>(url: string, body: B, config?: Config) => {
    let headers = new HttpHeaders();
    if (config?.token) {
      headers = headers.set('Authorization', `Bearer ${config.token}`);
    }

    if (config?.isRefreshToken) {
      headers = headers.set('refresh-token', `${config.token}`);
    }

    if (config?.useResultInterceptor) {
      headers = headers.set('X-Use-Year', 'true');
    }

    if (config?.clarisaApiKey) {
      headers = headers.set('X-API-Key', environment.clarisaApiKey);
    }

    if (config?.headers) {
      Object.entries(config.headers).forEach(([key, value]) => {
        headers = headers.set(key, value);
      });
    }

    headers = this.applyAuthMarker(headers, config);

    return this.TP(this.http.post<T>(this.getEnv(config?.isAuth) + url, body, { headers }));
  };

  put = <T, B>(url: string, body: B, config?: Config) => {
    let headers = new HttpHeaders();

    if (config?.useResultInterceptor) {
      headers = headers.set('X-Use-Year', 'true');
    }

    headers = this.applyAuthMarker(headers, config);

    return this.TP(this.http.put<T>(this.getEnv(config?.isAuth) + url, body, { headers }));
  };

  get = <T>(url: string, config?: Config) => {
    let headers = config?.params instanceof HttpHeaders ? config.params : new HttpHeaders();

    if (config?.useResultInterceptor) {
      headers = headers.set('X-Use-Year', 'true');
    }
    if (config?.platform) {
      headers = headers.set('X-Platform', config.platform);
    }
    if (config?.noAuthInterceptor) {
      headers = headers.set('no-auth-interceptor', 'true');
    }

    if (config?.headers) {
      Object.entries(config.headers).forEach(([key, value]) => {
        headers = headers.set(key, value);
      });
    }

    headers = this.applyAuthMarker(headers, config);

    const fullUrl = this.getEnv(config?.isAuth) + url;

    return this.TP(
      this.http.get<T>(fullUrl, {
        headers,
        params: config?.params,
        ...(config?.noCache && { cache: 'no-store' })
      }),
      config?.loadingTrigger
    );
  };

  getBlob = (url: string, config?: Config): Promise<Blob> => {
    let headers = new HttpHeaders();

    if (config?.useResultInterceptor) {
      headers = headers.set('X-Use-Year', 'true');
    }
    if (config?.platform) {
      headers = headers.set('X-Platform', config.platform);
    }
    if (config?.noAuthInterceptor) {
      headers = headers.set('no-auth-interceptor', 'true');
    }

    headers = this.applyAuthMarker(headers, config);

    const fullUrl = this.getEnv(config?.isAuth) + url;

    return firstValueFrom(
      this.http.get(fullUrl, {
        headers,
        params: config?.params,
        responseType: 'blob',
        ...(config?.noCache && { cache: 'no-store' })
      })
    );
  };

  getWithParams = <T>(url: string, params?: Record<string, string>, config?: Config) => {
    return this.TP(this.http.get<T>(this.getEnv(config?.isAuth) + url, { params }), config?.loadingTrigger);
  };

  patch = <T, B>(url: string, body: B, config?: Config) => {
    let headers = new HttpHeaders();

    if (config?.useResultInterceptor) {
      headers = headers.set('X-Use-Year', 'true');
    }

    headers = this.applyAuthMarker(headers, config);

    return this.TP(this.http.patch<T>(this.getEnv(config?.isAuth) + url, body, { headers }));
  };

  getEnv = (isAuth: boolean | string | undefined) => {
    if (typeof isAuth === 'string') return isAuth;
    return isAuth ? environment.managementApiUrl : environment.mainApiUrl;
  };

  /**
   * // @akili-spec changes/profile-simulation
   * Design §5 "Client start" / D-imp-12. `config.isAuth === true` (strict —
   * not the string overrides used by unrelated external services like
   * `saveErrorsUrl`) identifies a ROAR-bound call (login / refresh-token /
   * current-user). `jWtInterceptor` reads this marker to decide never to
   * attach `X-Impersonation-Session`, instead of comparing hosts — the
   * local env has `mainApiUrl === managementApiUrl`, which makes a
   * host-based check unfalsifiable (J-17).
   */
  private applyAuthMarker(headers: HttpHeaders, config?: Config): HttpHeaders {
    return config?.isAuth === true ? headers.set('X-Ari-Auth-Call', '1') : headers;
  }

  getGreenChecks = (): Promise<MainResponse<GreenChecks>> => {
    const url = () => `results/green-checks/${this.cacheService.getCurrentNumericResultId()}`;
    return this.get(url(), { useResultInterceptor: true });
  };

  async updateGreenChecks() {
    const response = await this.getGreenChecks();
    this.cacheService.greenChecks.set(response.data);
  }
}

interface Config {
  token?: string;
  isAuth?: boolean | string;
  isRefreshToken?: boolean;
  loadingTrigger?: boolean;
  params?: HttpParams;
  useResultInterceptor?: boolean;
  platform?: string;
  noCache?: boolean;
  noAuthInterceptor?: boolean;
  clarisaApiKey?: boolean;
  /** Extra raw headers to set on the request (e.g. `X-Impersonation-Session`). */
  headers?: Record<string, string>;
}
