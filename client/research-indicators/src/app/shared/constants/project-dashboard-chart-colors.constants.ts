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
