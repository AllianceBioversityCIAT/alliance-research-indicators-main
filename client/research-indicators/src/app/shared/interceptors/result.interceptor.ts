import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { platformFromResultCodeOrNull } from '@shared/utils/platform-code.util';

export const resultInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const shouldUseYear = req.headers.has('X-Use-Year');

  if (!shouldUseYear) {
    return next(req);
  }

  
  const headers = req.headers.delete('X-Use-Year');
  const year = getYearFromUrl(router);
  
  // Check if platform is provided via header, otherwise get from URL
  const platformFromHeader = req.headers.get('X-Platform');
  const platform = platformFromHeader || getPlatformFromUrl(router);


  let modifiedUrl = req.url;

  if (year) {
    modifiedUrl = addParameterToUrl(modifiedUrl, 'reportYear', year);
  }

  if (platform) {
    modifiedUrl = addParameterToUrl(modifiedUrl, 'reportingPlatforms', platform);
  }


  const clonedRequest = req.clone({
    url: modifiedUrl,
    headers
  });

  return next(clonedRequest);
};

function getYearFromUrl(router: Router): string | null {
  const tree = router.parseUrl(router.url);
  return tree.queryParams['version'] ?? null;
}

function getPlatformFromUrl(router: Router): string | null {
  const url = router.url;

  // Derive from the shared util's OrNull variant (design.md §2.2, DD-4) rather
  // than building a second alternation regex here. The previous alternation
  // matched neither an unrecognized prefix nor a non-numeric code and fell
  // through to `null` (no `reportingPlatforms` param sent) — a hardcoded subset
  // once silently omitted AICCRA this exact way, and the server fell back to
  // platform_code='STAR', surfacing as "Result not found" on every service.
  // `platformFromResultCodeOrNull` reproduces that matching behavior exactly
  // (case-sensitive, `null` on anything unrecognized): only the derivation moved,
  // not what this interceptor accepts.
  const resultCodeRegex = /result\/([A-Za-z]+-\d+|\d+)/;
  const resultCodeMatch = resultCodeRegex.exec(url);
  if (!resultCodeMatch) {
    return null;
  }

  return platformFromResultCodeOrNull(resultCodeMatch[1]);
}

function addParameterToUrl(url: string, paramName: string, paramValue: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${paramName}=${paramValue}`;
}
