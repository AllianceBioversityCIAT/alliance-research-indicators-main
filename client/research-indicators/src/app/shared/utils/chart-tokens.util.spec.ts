import { signal } from '@angular/core';
import { CHART_TOKEN_NAMES, chartTokens } from './chart-tokens.util';

describe('chart-tokens.util (R-PD-006 / D-PD-5 / R-DA-008)', () => {
  let getPropertyValueMock: jest.Mock;

  beforeEach(() => {
    getPropertyValueMock = jest.fn().mockReturnValue('');
    jest.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: getPropertyValueMock
    } as unknown as CSSStyleDeclaration);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // KZ-017: jsdom returns '' for custom properties, so resolved values are
  // structurally unverifiable here. Tests assert the *requested token names*
  // only — visual correctness is T-12's D6 gate.

  it('requests every --ac-viz-* token from document.documentElement', () => {
    const isDark = signal(false);
    const tokens = chartTokens(isDark);
    tokens();

    expect(window.getComputedStyle).toHaveBeenCalledWith(document.documentElement);
    expect(getPropertyValueMock).toHaveBeenCalledTimes(CHART_TOKEN_NAMES.length);
    CHART_TOKEN_NAMES.forEach(name => {
      expect(getPropertyValueMock).toHaveBeenCalledWith(name);
    });
  });

  it('does not introduce a hex fallback — empty resolution stays empty', () => {
    const isDark = signal(false);
    const tokens = chartTokens(isDark);
    const resolved = tokens();

    expect(resolved.statusApproved).toBe('');
    expect(resolved.statusSubmitted).toBe('');
    expect(resolved.statusDraft).toBe('');
    expect(resolved.statusPending).toBe('');
    expect(resolved.statusRejected).toBe('');
    expect(resolved.statusNoStatus).toBe('');
    expect(resolved.series1).toBe('');
    expect(resolved.series2).toBe('');
    expect(resolved.series3).toBe('');
    expect(resolved.series4).toBe('');
    expect(resolved.series5).toBe('');
    expect(resolved.rolePrimary).toBe('');
    expect(resolved.roleContributing).toBe('');
    expect(resolved.roleUnknown).toBe('');
    expect(resolved.ramp1).toBe('');
    expect(resolved.ramp2).toBe('');
    expect(resolved.ramp3).toBe('');
    expect(resolved.ramp4).toBe('');
    expect(resolved.ramp5).toBe('');
    expect(resolved.ramp).toEqual(['', '', '', '', '']);
  });

  it('re-resolves the tokens when the dark-mode signal flips (reactivity)', () => {
    const isDark = signal(false);
    const tokens = chartTokens(isDark);

    tokens();
    expect(getPropertyValueMock).toHaveBeenCalledTimes(CHART_TOKEN_NAMES.length);

    getPropertyValueMock.mockClear();
    isDark.set(true);
    tokens();

    expect(getPropertyValueMock).toHaveBeenCalledTimes(CHART_TOKEN_NAMES.length);
    CHART_TOKEN_NAMES.forEach(name => {
      expect(getPropertyValueMock).toHaveBeenCalledWith(name);
    });
  });

  it('exposes exactly the nineteen chart tokens the spec defines', () => {
    expect(CHART_TOKEN_NAMES).toEqual([
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
    ]);
    expect(CHART_TOKEN_NAMES.length).toBe(19);
  });
});
