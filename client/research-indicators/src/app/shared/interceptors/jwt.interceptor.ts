import { HttpInterceptorFn, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { CacheService } from '@services/cache/cache.service';
import { inject } from '@angular/core';
import { ActionsService } from '@services/actions.service';
import { ImpersonationService } from '@services/impersonation.service';
import { environment } from '@envs/environment';
import { from, throwError } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

/** Marker set by `ToPromiseService.applyAuthMarker` on ROAR-bound calls (D-imp-12). */
const AUTH_CALL_MARKER = 'X-Ari-Auth-Call';

/**
 * // @akili-spec changes/profile-simulation
 * Design §5 "Client start" / D-imp-12. `isAuthCall` is the marker captured
 * (and stripped from the request) ONCE at the top of `jWtInterceptor`,
 * before any host-based branching — never re-derived from host strings,
 * since `mainApiUrl` may equal `managementApiUrl` (J-17), and a marked call
 * may resolve to `managementApiUrl` while it differs from `mainApiUrl`
 * (login / current-user), matching none of the four-host `if` branches.
 * A marked call gets NO impersonation header. All other main-API requests
 * get `X-Impersonation-Session` attached while a simulation is active.
 */
function decorateWithImpersonation(
  isAuthCall: boolean,
  clonedRequest: HttpRequest<unknown>,
  impersonation: ImpersonationService
): HttpRequest<unknown> {
  if (isAuthCall) {
    return clonedRequest;
  }
  if (impersonation.active()) {
    const sessionId = impersonation.sessionId();
    if (sessionId) {
      return clonedRequest.clone({ setHeaders: { 'X-Impersonation-Session': sessionId } });
    }
  }
  return clonedRequest;
}

export const jWtInterceptor: HttpInterceptorFn = (req, next) => {
  const cacheService = inject(CacheService);
  const actionsService = inject(ActionsService);
  const impersonationService = inject(ImpersonationService);
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

  // R-IMP-009/D-imp-12: capture + strip the auth-call marker ONCE, before any
  // host-based branching. Every downstream path — the refresh-token early
  // return, the domain-matched branch, and the final unmatched pass-through
  // (e.g. login/current-user hitting `managementApiUrl` when it differs from
  // `mainApiUrl`) — inherits a request with the marker already gone, and
  // `decorateWithImpersonation` gates on the captured boolean, never on host
  // strings.
  const isAuthCall = req.headers.has(AUTH_CALL_MARKER);
  if (isAuthCall) {
    req = req.clone({ headers: req.headers.delete(AUTH_CALL_MARKER) });
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
          // R-IMP-009: impersonation-header decoration — main-API branch only.
          clonedRequest = decorateWithImpersonation(isAuthCall, clonedRequest, impersonationService);
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

                    // Retry original request with new token — clone the already-decorated
                    // `clonedRequest` (not the raw `req`) so the impersonation header (and
                    // marker-stripped state) added above survives the retry (J-10).
                    const retryRequest = clonedRequest.clone({
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
