import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, timer, merge, throwError, ignoreElements, from, switchMap } from 'rxjs';
import { inject } from '@angular/core';
import { ActionsService } from '@services/actions.service';
import { CacheService } from '../services/cache/cache.service';
import { ApiService } from '../services/api.service';
import { PostError } from '../interfaces/post-error.interface';
import { Router } from '@angular/router';

/** First human-readable message an error envelope offers, never blank. */
const errorDetailMessage = (error: HttpErrorResponse): string => {
  const body = error.error as { errors?: unknown; description?: unknown } | null | undefined;
  const candidates = [body?.errors, body?.description, error.message];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      return candidate;
    }
  }
  return 'Something went wrong, please try again.';
};

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const actions = inject(ActionsService);
  const cache = inject(CacheService);
  const api = inject(ApiService);
  const router = inject(Router);

  // Skip timeout check for error endpoint to avoid infinite loop
  if (req.url.includes('ciat-errors.yecksin.workers.dev')) {
    return next(req);
  }

  const createErrorObj = (status: 'error' | 'pending', message: string, originalError?: HttpErrorResponse): PostError => {
    const now = new Date();
    const user = cache.dataCache()?.user;
    return {
      path: req.url,
      current_route: router.url,
      domain: window.location.hostname,
      status,
      timestamp: now.toLocaleString(),
      message,
      original_error: originalError,
      user_id: user?.sec_user_id.toString(),
      user_name: `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim(),
      user_email: user?.email
    };
  };

  // Create a timer for 5 seconds
  const timeoutCheck = timer(5000).pipe(
    switchMap(() => {
      const timeoutObj = createErrorObj('pending', 'Request is taking longer than 5 seconds to respond');
      return from(api.saveErrors(timeoutObj));
    }),
    ignoreElements() // Ignore the timer values
  );

  // Use merge instead of race to run both observables
  return merge(
    timeoutCheck,
    next(req).pipe(
      catchError((error: HttpErrorResponse) => {
        const errorObj = createErrorObj('error', error.message, error);

        // Send error to tracking endpoint
        from(api.saveErrors(errorObj)).subscribe();

        const isAiFormalizeError = error.status === 502 && req.url.includes('results/ai/formalize');

        const isPoolFundingTagValidationError = error.status === 400 && req.url.includes('/pool-funding-tag');

        const isPoolFundingAlignmentValidationError = error.status === 400 && req.url.includes('/pool-funding-alignment');

        // The PRMS sync endpoint owns its own error UX: `result-sidebar` shows a
        // friendly modal for EVERY failure. Without this the interceptor stacked a
        // second, technical toast on top of that modal.
        // Suppressed by URL alone, not by status, deliberately: the component
        // handles the whole failure surface (422 refused/rejected, 502/503
        // transport), so any status-narrowing here would let one of them leak a
        // toast back. 401 and 409 are already excluded globally below.
        const isPrmsSyncError = req.url.includes('/prms-sync');

        if (
          cache.isLoggedIn() &&
          error.status !== 409 &&
          error.status !== 401 &&
          !req.url.includes('refresh-token') &&
          !isAiFormalizeError &&
          !isPoolFundingTagValidationError &&
          !isPoolFundingAlignmentValidationError &&
          !isPrmsSyncError
        ) {
          // `error.error.errors` alone silently produced a blank toast for every
          // endpoint whose envelope carries `description` instead of `errors`
          // (measured 2026-09-16: the PRMS sync 502/503 bodies have no `errors`
          // key at all), and it THREW a TypeError inside this catchError whenever
          // a true network failure left `error.error` null — losing the message
          // entirely, which is the worst case: a failed request that looks silent.
          actions.showToast({
            detail: errorDetailMessage(error),
            severity: 'error',
            summary: 'Error'
          });
        }

        return throwError(() => error);
      })
    )
  );
};
