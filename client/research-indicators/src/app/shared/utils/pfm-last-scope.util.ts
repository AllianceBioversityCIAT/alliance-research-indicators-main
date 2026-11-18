import { PFM_SCOPES, PfmScope } from '@pages/platform/pages/pooled-funding-monitor/pfm.interfaces';

const STORAGE_KEY = 'ari.pfm.lastScope';

/** Remembers the monitor scope so a result opened from the queue can link back to the same one. */
export function rememberPfmScope(scope: PfmScope): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, scope);
  } catch {
    // storage blocked: the breadcrumb simply falls back to the monitor default
  }
}

export function lastPfmScope(): PfmScope | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    return (PFM_SCOPES as readonly string[]).includes(value ?? '') ? (value as PfmScope) : null;
  } catch {
    return null;
  }
}
