import { signal } from '@angular/core';
import { CHART_TOKEN_NAMES, chartTokens } from './chart-tokens.util';

describe('chart-tokens.util (R-PD-006 / D-PD-5)', () => {
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

  it('exposes exactly the seven chart tokens the spec defines', () => {
    expect(CHART_TOKEN_NAMES).toEqual([
      '--ac-viz-status-approved',
      '--ac-viz-status-submitted',
      '--ac-viz-status-draft',
      '--ac-viz-status-pending',
      '--ac-viz-status-rejected',
      '--ac-viz-status-no-status',
      '--ac-viz-series-1'
    ]);
  });
});
