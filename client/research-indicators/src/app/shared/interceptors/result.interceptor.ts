import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { PLATFORM_CODES } from '@shared/constants/platform-codes';

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

  // Derive from PLATFORM_CODES rather than listing codes here: a hardcoded subset
  // silently omitted AICCRA, so /result/AICCRA-123 matched neither this regex nor the
  // numeric fallback below, no reportingPlatforms param was sent, and the server fell
  // back to platform_code='STAR' — surfacing as "Result not found" on every service.
  const platformAlternation = Object.values(PLATFORM_CODES)
    .map(code => code.replace(/[-/\\^$*+?.()|[\]{}]/g, ''))
    .join('|');
  const platformRegex = new RegExp(`result/(${platformAlternation})-(\\d+)`);
  const platformMatch = platformRegex.exec(url);
  if (platformMatch) {
    return platformMatch[1];
  }

  const resultRegex = /result\/(\d+)/;
  const resultMatch = resultRegex.exec(url);
  if (resultMatch) {
    return PLATFORM_CODES.STAR;
  }

  return null;
}

function addParameterToUrl(url: string, paramName: string, paramValue: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${paramName}=${paramValue}`;
}
