import { PROJECT_DASHBOARD_RANK_BAR_COLORS, projectDashboardBarColor } from './project-dashboard-chart-colors.constants';

describe('projectDashboardBarColor', () => {
  it('should return the single-value color when the chart has one item', () => {
    expect(projectDashboardBarColor(0, 1)).toBe('#112f5c');
  });

  it('should return rank colors for the first three bars', () => {
    expect(projectDashboardBarColor(0, 5)).toBe(PROJECT_DASHBOARD_RANK_BAR_COLORS.first);
    expect(projectDashboardBarColor(1, 5)).toBe(PROJECT_DASHBOARD_RANK_BAR_COLORS.second);
    expect(projectDashboardBarColor(2, 5)).toBe(PROJECT_DASHBOARD_RANK_BAR_COLORS.third);
  });

  it('should return the last color for the last bar when there are at least four items', () => {
    expect(projectDashboardBarColor(4, 5)).toBe(PROJECT_DASHBOARD_RANK_BAR_COLORS.last);
  });

  it('should return the middle color for non-ranked middle bars', () => {
    expect(projectDashboardBarColor(3, 5)).toBe(PROJECT_DASHBOARD_RANK_BAR_COLORS.middle);
  });
});
