import { Signal, computed } from '@angular/core';

export interface ChartTokens {
  statusApproved: string;
  statusSubmitted: string;
  statusDraft: string;
  statusPending: string;
  statusRejected: string;
  statusNoStatus: string;
  series1: string;
  series2: string;
  series3: string;
  series4: string;
  series5: string;
  rolePrimary: string;
  roleContributing: string;
  roleUnknown: string;
  ramp1: string;
  ramp2: string;
  ramp3: string;
  ramp4: string;
  ramp5: string;
  ramp: string[];
}

// Token names resolved from `getComputedStyle(document.documentElement)`.
// Exported so tests assert the *requested* set rather than resolved values
// (jsdom returns '' for custom properties — KZ-017).
export const CHART_TOKEN_NAMES = [
  '--ac-viz-status-approved',
  '--ac-viz-status-submitted',
  '--ac-viz-status-draft',
  '--ac-viz-status-pending',
  '--ac-viz-status-rejected',
  '--ac-viz-status-no-status',
  '--ac-viz-series-1',
  '--ac-viz-series-2',
  '--ac-viz-series-3',
  '--ac-viz-series-4',
  '--ac-viz-series-5',
  '--ac-viz-role-primary',
  '--ac-viz-role-contributing',
  '--ac-viz-role-unknown',
  '--ac-viz-ramp-1',
  '--ac-viz-ramp-2',
  '--ac-viz-ramp-3',
  '--ac-viz-ramp-4',
  '--ac-viz-ramp-5'
] as const;

function resolveToken(tokenName: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(tokenName).trim();
}

// Resolves the `--ac-viz-*` chart-token family from the document, keyed on the
// dark-mode signal so canvas series re-resolve if `data-theme` ever flips at
// runtime (D-PD-5). No hex fallback — empty resolution stays empty; visual
// correctness belongs to gate D6 (KZ-017).
export function chartTokens(isDarkMode: Signal<boolean>): Signal<ChartTokens> {
  return computed(() => {
    isDarkMode(); // establish reactivity on the theme signal
    const ramp1 = resolveToken('--ac-viz-ramp-1');
    const ramp2 = resolveToken('--ac-viz-ramp-2');
    const ramp3 = resolveToken('--ac-viz-ramp-3');
    const ramp4 = resolveToken('--ac-viz-ramp-4');
    const ramp5 = resolveToken('--ac-viz-ramp-5');

    return {
      statusApproved: resolveToken('--ac-viz-status-approved'),
      statusSubmitted: resolveToken('--ac-viz-status-submitted'),
      statusDraft: resolveToken('--ac-viz-status-draft'),
      statusPending: resolveToken('--ac-viz-status-pending'),
      statusRejected: resolveToken('--ac-viz-status-rejected'),
      statusNoStatus: resolveToken('--ac-viz-status-no-status'),
      series1: resolveToken('--ac-viz-series-1'),
      series2: resolveToken('--ac-viz-series-2'),
      series3: resolveToken('--ac-viz-series-3'),
      series4: resolveToken('--ac-viz-series-4'),
      series5: resolveToken('--ac-viz-series-5'),
      rolePrimary: resolveToken('--ac-viz-role-primary'),
      roleContributing: resolveToken('--ac-viz-role-contributing'),
      roleUnknown: resolveToken('--ac-viz-role-unknown'),
      ramp1,
      ramp2,
      ramp3,
      ramp4,
      ramp5,
      ramp: [ramp1, ramp2, ramp3, ramp4, ramp5]
    };
  });
}
