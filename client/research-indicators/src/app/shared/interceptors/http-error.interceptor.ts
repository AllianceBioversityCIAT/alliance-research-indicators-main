import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, timer, merge, throwError, ignoreElements, from, switchMap } from 'rxjs';
import { inject } from '@angular/core';
import { ActionsService } from '@services/actions.service';
import { CacheService } from '../services/cache/cache.service';
import { ApiService } from '../services/api.service';
import { PostError } from '../interfaces/post-error.interface';
import { Router } from '@angular/router';

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

        const isAiFormalizeError =
          error.status === 502 && req.url.includes('results/ai/formalize');

        const isPoolFundingTagValidationError =
          error.status === 400 && req.url.includes('/pool-funding-tag');

        const isPoolFundingAlignmentValidationError =
          error.status === 400 && req.url.includes('/pool-funding-alignment');

        if (
          cache.isLoggedIn() &&
          error.status !== 409 &&
          error.status !== 401 &&
          !req.url.includes('refresh-token') &&
          !isAiFormalizeError &&
          !isPoolFundingTagValidationError &&
          !isPoolFundingAlignmentValidationError
        ) {
          actions.showToast({ detail: error.error.errors, severity: 'error', summary: 'Error' });
        }

        return throwError(() => error);
      })
    )
  );
};
