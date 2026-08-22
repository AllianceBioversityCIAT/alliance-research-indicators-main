import { Signal, computed } from '@angular/core';

export interface ChartTokens {
  statusApproved: string;
  statusSubmitted: string;
  statusDraft: string;
  statusPending: string;
  statusRejected: string;
  statusNoStatus: string;
  series1: string;
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
  '--ac-viz-series-1'
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
    return {
      statusApproved: resolveToken('--ac-viz-status-approved'),
      statusSubmitted: resolveToken('--ac-viz-status-submitted'),
      statusDraft: resolveToken('--ac-viz-status-draft'),
      statusPending: resolveToken('--ac-viz-status-pending'),
      statusRejected: resolveToken('--ac-viz-status-rejected'),
      statusNoStatus: resolveToken('--ac-viz-status-no-status'),
      series1: resolveToken('--ac-viz-series-1')
    };
  });
}
