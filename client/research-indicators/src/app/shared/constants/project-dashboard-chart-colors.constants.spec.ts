import {
  PROJECT_DASHBOARD_RANK_BAR_COLORS,
  projectDashboardBarColor,
  valueRampColor
} from './project-dashboard-chart-colors.constants';

describe('projectDashboardBarColor', () => {
  it('should return the single-value color when the chart has one item', () => {
    expect(projectDashboardBarColor(0, 1)).toBe('var(--ac-primary-blue-600)');
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

describe('valueRampColor', () => {
  it('should return var(--ac-viz-ramp-N) token names, never hex or rank tokens', () => {
    expect(valueRampColor(5, 10)).toMatch(/^var\(--ac-viz-ramp-[1-5]\)$/);
  });

  it('should return the lightest ramp step when max is 0 (edge: max=0)', () => {
    expect(valueRampColor(0, 0)).toBe('var(--ac-viz-ramp-1)');
    expect(valueRampColor(5, 0)).toBe('var(--ac-viz-ramp-1)');
  });

  it('should return the lightest ramp step when value is 0 (edge: value=0)', () => {
    expect(valueRampColor(0, 10)).toBe('var(--ac-viz-ramp-1)');
  });

  it('should return the darkest ramp step when value equals max (edge: value=max)', () => {
    expect(valueRampColor(10, 10)).toBe('var(--ac-viz-ramp-5)');
    expect(valueRampColor(1, 1)).toBe('var(--ac-viz-ramp-5)');
  });

  it('should be monotonically non-decreasing as share increases', () => {
    const steps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => valueRampColor(value, 10));
    const indices = steps.map(token => Number(token.match(/ramp-(\d)/)?.[1]));
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThanOrEqual(indices[i - 1]);
    }
    expect(indices[indices.length - 1]).toBe(5);
  });

  it('should support a custom ramp length', () => {
    expect(valueRampColor(3, 3, 3)).toBe('var(--ac-viz-ramp-3)');
    expect(valueRampColor(1, 3, 3)).toBe('var(--ac-viz-ramp-1)');
  });
});
