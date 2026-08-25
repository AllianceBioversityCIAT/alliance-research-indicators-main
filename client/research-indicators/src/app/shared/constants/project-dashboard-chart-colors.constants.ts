/** Rank-based bar colors for dashboard column/row charts (1st → last) using CSS token variables. */
export const PROJECT_DASHBOARD_RANK_BAR_COLORS = {
  first: 'var(--ac-green-500)',
  second: 'var(--ac-green-300)',
  third: 'var(--ac-light-blue-300)',
  middle: 'var(--ac-primary-blue-300)',
  last: 'var(--ac-primary-blue-600)'
} as const;

export function projectDashboardBarColor(index: number, total: number): string {
  if (total === 1) {
    return 'var(--ac-primary-blue-600)';
  }
  if (index === 0) {
    return PROJECT_DASHBOARD_RANK_BAR_COLORS.first;
  }
  if (index === 1) {
    return PROJECT_DASHBOARD_RANK_BAR_COLORS.second;
  }
  if (index === 2) {
    return PROJECT_DASHBOARD_RANK_BAR_COLORS.third;
  }
  if (total >= 4 && index === total - 1) {
    return PROJECT_DASHBOARD_RANK_BAR_COLORS.last;
  }
  return PROJECT_DASHBOARD_RANK_BAR_COLORS.middle;
}

/**
 * Maps a value's share of the list max onto the shared 5-stop sequential viz
 * ramp (`--ac-viz-ramp-1..5`), so bars colored by this function read as the
 * same magnitude family as the geo-scope-map choropleth for the same value
 * (R-DCR-003). Pure and theme-agnostic — the tokens themselves flip per
 * theme (colors.scss), this function only ever emits `var()` names (DD-6).
 */
export function valueRampColor(value: number, max: number, rampLength = 5): string {
  if (!(max > 0) || !(value > 0)) {
    return 'var(--ac-viz-ramp-1)';
  }
  const share = Math.min(value, max) / max;
  const index = Math.min(rampLength, Math.max(1, Math.ceil(share * rampLength)));
  return `var(--ac-viz-ramp-${index})`;
}
