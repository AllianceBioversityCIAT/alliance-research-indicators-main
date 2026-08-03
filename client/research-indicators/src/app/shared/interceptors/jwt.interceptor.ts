import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { CacheService } from '@services/cache/cache.service';
import { inject } from '@angular/core';
import { ActionsService } from '@services/actions.service';
import { environment } from '@envs/environment';
import { from, throwError } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

export const jWtInterceptor: HttpInterceptorFn = (req, next) => {
  const cacheService = inject(CacheService);
  const actionsService = inject(ActionsService);
  const jwtToken = cacheService.dataCache().access_token;
  const targetDomain = environment.mainApiUrl;
  const textMiningDomain = environment.textMiningUrl;
  const documentOverviewDomain = environment.documentOverviewUrl;
  const fileManagerDomain = environment.fileManagerUrl;

  if (req.headers.has('no-auth-interceptor')) {
    const cleanReq = req.clone({
      headers: req.headers.delete('no-auth-interceptor')
    });
    return next(cleanReq);
  }

  if (
    req.url.includes(targetDomain) ||
    req.url.includes(textMiningDomain) ||
    req.url.includes(documentOverviewDomain) ||
    req.url.includes(fileManagerDomain)
  ) {
    // Skip token refresh if this is already a refresh token request
    if (req.url.includes('refresh-token')) {
      return next(req);
    }

    // Proactive token validation
    return from(actionsService.isTokenExpired()).pipe(
      switchMap(tokenValidation => {
        const currentToken = tokenValidation.isTokenExpired ? tokenValidation?.token_data?.access_token : jwtToken;

        let clonedRequest;
        if (
          req.url.includes(fileManagerDomain) ||
          req.url.includes(textMiningDomain) ||
          req.url.includes(documentOverviewDomain)
        ) {
          clonedRequest = req.clone({
            setHeaders: {
              'access-token': currentToken ?? ''
            }
          });

          if (req.url.includes(textMiningDomain)) {
            const newFormData = req.body as FormData;
            newFormData.set('token', currentToken ?? '');
            clonedRequest = req.clone({
              body: newFormData
            });
          }
        } else {
          clonedRequest = req.clone({
            setHeaders: {
              Authorization: `Bearer ${currentToken}`
            }
          });
        }
        // Reactive error handling
        return next(clonedRequest).pipe(
          catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
              // Try to refresh token and retry the original request once
              return from(actionsService.api.refreshToken(cacheService.dataCache().refresh_token)).pipe(
                switchMap(response => {
                  if (response.successfulRequest) {
                    actionsService.updateLocalStorage(response, true);

                    // Retry original request with new token
                    const retryRequest = req.clone({
                      setHeaders: {
                        Authorization: `Bearer ${response.data.access_token}`
                      }
                    });
                    return next(retryRequest);
                  }
                  return throwError(() => error);
                }),
                catchError(() => {
                  // If refresh fails, logout and redirect
                  actionsService.logOut();
                  return throwError(() => error);
                })
              );
            }
            return throwError(() => error);
          })
        );
      })
    );
  }
  return next(req);
};
