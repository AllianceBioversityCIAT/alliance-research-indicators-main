import { isStatusChangeValidationRequired } from './status-workflow.util';

describe('isStatusChangeValidationRequired', () => {
  it('returns true for boolean true and numeric/string 1', () => {
    expect(isStatusChangeValidationRequired(true)).toBe(true);
    expect(isStatusChangeValidationRequired(1)).toBe(true);
    expect(isStatusChangeValidationRequired('1')).toBe(true);
  });

  it('returns false for falsy and other values', () => {
    expect(isStatusChangeValidationRequired(false)).toBe(false);
    expect(isStatusChangeValidationRequired(0)).toBe(false);
    expect(isStatusChangeValidationRequired(undefined)).toBe(false);
    expect(isStatusChangeValidationRequired(null)).toBe(false);
  });
});
