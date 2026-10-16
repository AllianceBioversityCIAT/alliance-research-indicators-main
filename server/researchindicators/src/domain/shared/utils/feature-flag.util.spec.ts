import { isFeatureFlagEnabled } from './feature-flag.util';

describe('isFeatureFlagEnabled (R-PFT-003 / D-2)', () => {
  const table: Array<{
    label: string;
    value: string | null | undefined;
    enabled: boolean;
  }> = [
    { label: 'undefined', value: undefined, enabled: true },
    { label: 'null', value: null, enabled: true },
    { label: 'empty', value: '', enabled: true },
    { label: 'whitespace', value: '   ', enabled: true },
    { label: 'maybe', value: 'maybe', enabled: true },
    { label: '0', value: '0', enabled: true },
    { label: 'no', value: 'no', enabled: true },
    { label: 'off', value: 'off', enabled: true },
    { label: 'FALSE', value: 'FALSE', enabled: false },
    { label: 'padded false', value: ' false ', enabled: false },
    { label: 'false', value: 'false', enabled: false },
    { label: 'true', value: 'true', enabled: true },
  ];

  it.each(table)('$label is enabled=$enabled', ({ value, enabled }) => {
    expect(isFeatureFlagEnabled(value)).toBe(enabled);
  });
});
