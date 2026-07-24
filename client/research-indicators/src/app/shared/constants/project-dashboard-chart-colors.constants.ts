/** Rank-based bar colors for dashboard column/row charts (1st → last). */
export const PROJECT_DASHBOARD_RANK_BAR_COLORS = {
  first: '#358540',
  second: '#7CB580',
  third: '#1689CA',
  middle: '#345b8f',
  last: '#112F5C'
} as const;

export function projectDashboardBarColor(index: number, total: number): string {
  if (total === 1) {
    return '#112f5c';
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

export const GEO_SCOPE_SUMMARY_COLORS = {
  global: '#112F5C',
  regional: '#035BA9',
  countries: '#1689CA',
  sub_national: '#7C9CB9',
  yet_to_be_determined: '#A2A9AF'
} as const;
